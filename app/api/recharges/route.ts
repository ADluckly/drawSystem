import dayjs from "dayjs";
import mongoose, { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { buildRechargeFilter } from "@/lib/business/record-filters";
import { applyRechargeLedger } from "@/lib/business/lesson-ledger";
import { generateRechargeSerial } from "@/lib/business/recharge-serial";
import {
  connectMongoDB,
  isTransactionUnsupportedError,
  supportsMongoTransactions,
} from "@/lib/mongodb";
import { CourseModel } from "@/models/course";
import { PAYMENT_METHODS, RechargeModel } from "@/models/recharge";
import { StudentModel } from "@/models/student";

interface RechargeCreateBody {
  studentId?: string;
  courseId?: string;
  packageName?: string;
  lessonAdded?: number;
  giftAdded?: number;
  amount?: number;
  paymentMethod?: (typeof PAYMENT_METHODS)[number];
  note?: string;
}

interface ResolvedRechargeContext {
  packageName: string;
  lessonAdded: number;
  giftAdded: number;
  expireAt: Date | null;
}

async function resolveRechargeContext(body: RechargeCreateBody, session?: mongoose.ClientSession) {
  let packageName = body.packageName?.trim();
  let lessonAdded = body.lessonAdded ?? 0;
  let giftAdded = body.giftAdded ?? 0;
  let expireAt: Date | null = null;

  if (body.courseId) {
    const query = CourseModel.findById(body.courseId).select(
      "name lessonCount giftLesson expireDays status",
    );
    const course = session ? await query.session(session).lean() : await query.lean();

    if (!course || course.status !== "active") {
      throw new Error("COURSE_NOT_ACTIVE");
    }

    packageName = packageName || course.name;
    lessonAdded = body.lessonAdded ?? course.lessonCount;
    giftAdded = body.giftAdded ?? course.giftLesson;
    expireAt = dayjs().add(course.expireDays, "day").endOf("day").toDate();
  }

  return {
    packageName: packageName || "自定义充值",
    lessonAdded,
    giftAdded,
    expireAt,
  } satisfies ResolvedRechargeContext;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  await connectMongoDB();

  const query = await buildRechargeFilter({
    studentId: request.nextUrl.searchParams.get("studentId"),
    classId: request.nextUrl.searchParams.get("classId"),
    paymentMethod: request.nextUrl.searchParams.get("paymentMethod"),
    fromDate: request.nextUrl.searchParams.get("fromDate")
      ? new Date(request.nextUrl.searchParams.get("fromDate") as string)
      : undefined,
    toDate: request.nextUrl.searchParams.get("toDate")
      ? new Date(request.nextUrl.searchParams.get("toDate") as string)
      : undefined,
  });

  const items = await RechargeModel.find(query)
    .populate({ path: "studentId", select: "name mobile classId", populate: { path: "classId", select: "name" } })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return successResponse({
    items: items.map((item) => {
      const studentRef = item.studentId as unknown as
        | { _id: unknown; name: string; mobile: string; classId?: { name: string } | null }
        | undefined;

      return {
        id: String(item._id),
        serialNo: item.serialNo,
        student: studentRef
          ? {
              id: String(studentRef._id),
              name: studentRef.name,
              mobile: studentRef.mobile,
              className: studentRef.classId?.name ?? null,
            }
          : null,
        packageName: item.packageName,
        lessonAdded: item.lessonAdded,
        giftAdded: item.giftAdded,
        amount: item.amount,
        paymentMethod: item.paymentMethod,
        note: item.note,
        createdAt: item.createdAt,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as RechargeCreateBody | null;
  if (!body?.studentId || body.amount === undefined || !body.paymentMethod) {
    return errorResponse(
      "INVALID_REQUEST",
      "studentId, amount and paymentMethod are required.",
      400,
    );
  }

  if (!isValidObjectId(body.studentId)) {
    return errorResponse("INVALID_REQUEST", "studentId is invalid.", 400);
  }

  if (!PAYMENT_METHODS.includes(body.paymentMethod)) {
    return errorResponse("INVALID_REQUEST", "paymentMethod is invalid.", 400);
  }

  const idempotencyKey = request.headers.get("x-idempotency-key") ?? undefined;

  await connectMongoDB();

  if (idempotencyKey) {
    const existed = await RechargeModel.findOne({ idempotencyKey }).lean();
    if (existed) {
      return successResponse({
        id: String(existed._id),
        serialNo: existed.serialNo,
        idempotent: true,
      });
    }
  }

  const useTransactions = await supportsMongoTransactions();
  const session = useTransactions ? await mongoose.startSession() : null;

  try {
    let result: { id: string; serialNo: string } | null = null;

    if (!useTransactions) {
      const student = await StudentModel.findById(body.studentId)
        .select("lessonTotal lessonUsed lessonLeft lessonGift lessonExpireAt status")
        .lean();

      if (!student || student.status !== "active") {
        throw new Error("STUDENT_NOT_ACTIVE");
      }

      const resolved = await resolveRechargeContext(body);
      const nextLedger = applyRechargeLedger(
        {
          lessonTotal: student.lessonTotal,
          lessonUsed: student.lessonUsed,
          lessonLeft: student.lessonLeft,
          lessonGift: student.lessonGift,
        },
        {
          lessonAdded: resolved.lessonAdded,
          giftAdded: resolved.giftAdded,
        },
      );

      const updateResult = await StudentModel.updateOne(
        { _id: body.studentId, status: "active" },
        {
          $set: {
            lessonTotal: nextLedger.lessonTotal,
            lessonUsed: nextLedger.lessonUsed,
            lessonLeft: nextLedger.lessonLeft,
            lessonGift: nextLedger.lessonGift,
            lessonExpireAt: resolved.expireAt,
            updatedBy: auth.session.adminId,
          },
        },
      );

      if (!updateResult.matchedCount) {
        throw new Error("STUDENT_NOT_ACTIVE");
      }

      try {
        const rechargeDoc = await RechargeModel.create({
          serialNo: generateRechargeSerial(),
          idempotencyKey: idempotencyKey ?? null,
          studentId: body.studentId,
          courseId: body.courseId ?? null,
          packageName: resolved.packageName,
          lessonAdded: resolved.lessonAdded,
          giftAdded: resolved.giftAdded,
          amount: body.amount,
          paymentMethod: body.paymentMethod,
          expireAt: resolved.expireAt,
          note: body.note?.trim() ?? "",
          operatorId: auth.session.adminId,
          operatorName: auth.session.username,
        });

        result = {
          id: String(rechargeDoc._id),
          serialNo: rechargeDoc.serialNo,
        };
      } catch (createError) {
        await StudentModel.updateOne(
          { _id: body.studentId },
          {
            $set: {
              lessonTotal: student.lessonTotal,
              lessonUsed: student.lessonUsed,
              lessonLeft: student.lessonLeft,
              lessonGift: student.lessonGift,
              lessonExpireAt: student.lessonExpireAt ?? null,
              updatedBy: auth.session.adminId,
            },
          },
        );
        throw createError;
      }
    } else {
      await session!.withTransaction(async () => {
        const student = await StudentModel.findById(body.studentId)
          .session(session!)
          .select("lessonTotal lessonUsed lessonLeft lessonGift lessonExpireAt status")
          .lean();

        if (!student || student.status !== "active") {
          throw new Error("STUDENT_NOT_ACTIVE");
        }

        const resolved = await resolveRechargeContext(body, session!);
        const nextLedger = applyRechargeLedger(
          {
            lessonTotal: student.lessonTotal,
            lessonUsed: student.lessonUsed,
            lessonLeft: student.lessonLeft,
            lessonGift: student.lessonGift,
          },
          {
            lessonAdded: resolved.lessonAdded,
            giftAdded: resolved.giftAdded,
          },
        );

        const rechargeDoc = await RechargeModel.create(
          [
            {
              serialNo: generateRechargeSerial(),
              idempotencyKey: idempotencyKey ?? null,
              studentId: body.studentId,
              courseId: body.courseId ?? null,
              packageName: resolved.packageName,
              lessonAdded: resolved.lessonAdded,
              giftAdded: resolved.giftAdded,
              amount: body.amount,
              paymentMethod: body.paymentMethod,
              expireAt: resolved.expireAt,
              note: body.note?.trim() ?? "",
              operatorId: auth.session.adminId,
              operatorName: auth.session.username,
            },
          ],
          { session: session! },
        );

        await StudentModel.updateOne(
          { _id: body.studentId },
          {
            $set: {
              lessonTotal: nextLedger.lessonTotal,
              lessonUsed: nextLedger.lessonUsed,
              lessonLeft: nextLedger.lessonLeft,
              lessonGift: nextLedger.lessonGift,
              lessonExpireAt: resolved.expireAt,
              updatedBy: auth.session.adminId,
            },
          },
          { session: session! },
        );

        result = {
          id: String(rechargeDoc[0]._id),
          serialNo: rechargeDoc[0].serialNo,
        };
      });
    }

    if (!result) {
      return errorResponse("INTERNAL_ERROR", "Recharge transaction failed.", 500);
    }

    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "STUDENT_NOT_ACTIVE") {
      return errorResponse("INVALID_STUDENT", "Student not found or inactive.", 400);
    }

    if (error instanceof Error && error.message === "COURSE_NOT_ACTIVE") {
      return errorResponse("INVALID_COURSE", "Course not found or inactive.", 400);
    }

    if (isTransactionUnsupportedError(error)) {
      return errorResponse(
        "RECHARGE_FAILED",
        "Recharge failed because MongoDB transactions are unavailable in the current deployment.",
        500,
      );
    }

    return errorResponse("RECHARGE_FAILED", "Recharge failed.", 500, String(error));
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
