import dayjs from "dayjs";
import mongoose, { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { applySignLedger } from "@/lib/business/lesson-ledger";
import {
  connectMongoDB,
  isTransactionUnsupportedError,
  supportsMongoTransactions,
} from "@/lib/mongodb";
import { SignModel } from "@/models/sign";
import { StudentModel } from "@/models/student";

interface SignCreateBody {
  studentId?: string;
  action?: "attend" | "leave";
  signDate?: string;
  note?: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  await connectMongoDB();

  const studentId = request.nextUrl.searchParams.get("studentId");
  const query = studentId ? { studentId } : {};

  const items = await SignModel.find(query)
    .populate("studentId", "name mobile")
    .sort({ signDate: -1 })
    .limit(100)
    .lean();

  return successResponse({
    items: items.map((item) => {
      const studentRef = item.studentId as unknown as
        | { _id: unknown; name: string; mobile: string }
        | undefined;

      return {
        id: String(item._id),
        student: studentRef
          ? {
              id: String(studentRef._id),
              name: studentRef.name,
              mobile: studentRef.mobile,
            }
          : null,
        signDate: item.signDate,
        signDateKey: item.signDateKey,
        action: item.action,
        lessonCost: item.lessonCost,
        note: item.note,
        createdAt: item.createdAt,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as SignCreateBody | null;
  if (!body?.studentId || !body.action) {
    return errorResponse("INVALID_REQUEST", "studentId and action are required.", 400);
  }

  if (!isValidObjectId(body.studentId)) {
    return errorResponse("INVALID_REQUEST", "studentId is invalid.", 400);
  }

  if (!["attend", "leave"].includes(body.action)) {
    return errorResponse("INVALID_REQUEST", "action must be attend or leave.", 400);
  }

  const action = body.action as "attend" | "leave";

  await connectMongoDB();

  const signDay = body.signDate ? dayjs(body.signDate) : dayjs();
  if (!signDay.isValid()) {
    return errorResponse("INVALID_REQUEST", "signDate is invalid.", 400);
  }

  const signDate = signDay.startOf("day").toDate();
  const signDateKey = signDay.format("YYYY-MM-DD");
  const idempotencyKey = request.headers.get("x-idempotency-key") ?? undefined;

  if (idempotencyKey) {
    const existedByIdempotency = await SignModel.findOne({ idempotencyKey }).lean();
    if (existedByIdempotency) {
      return successResponse({ id: String(existedByIdempotency._id), idempotent: true });
    }
  }

  // Business-level duplicate check before attempting write.
  const duplicated = await SignModel.findOne({ studentId: body.studentId, signDateKey })
    .select("_id")
    .lean();
  if (duplicated) {
    return errorResponse("DUPLICATE_SIGN", "Duplicate sign on the same day is not allowed.", 409);
  }

  const useTransactions = await supportsMongoTransactions();
  const session = useTransactions ? await mongoose.startSession() : null;

  try {
    let result: { id: string; action: "attend" | "leave"; lessonCost: number } | null = null;

    if (!useTransactions) {
      const student = await StudentModel.findById(body.studentId)
        .select("status lessonTotal lessonUsed lessonLeft lessonGift")
        .lean();

      if (!student || student.status !== "active") {
        throw new Error("STUDENT_NOT_ACTIVE");
      }

      const nextLedger = applySignLedger(
        {
          lessonTotal: student.lessonTotal,
          lessonUsed: student.lessonUsed,
          lessonLeft: student.lessonLeft,
          lessonGift: student.lessonGift,
        },
        {
          action,
          costPerSign: action === "attend" ? 1 : 0,
        },
      );

      const lessonCost = action === "attend" ? 1 : 0;

      const updateResult = await StudentModel.updateOne(
        {
          _id: body.studentId,
          status: "active",
          ...(action === "attend" ? { lessonLeft: { $gte: lessonCost } } : {}),
        },
        {
          $set: {
            lessonTotal: nextLedger.lessonTotal,
            lessonUsed: nextLedger.lessonUsed,
            lessonLeft: nextLedger.lessonLeft,
            lessonGift: nextLedger.lessonGift,
            updatedBy: auth.session.adminId,
          },
        },
      );

      if (!updateResult.matchedCount) {
        throw new Error("INSUFFICIENT_LESSON_OR_INACTIVE");
      }

      try {
        const created = await SignModel.create({
          idempotencyKey: idempotencyKey ?? null,
          studentId: body.studentId,
          signDate,
          signDateKey,
          action,
          lessonCost,
          note: body.note?.trim() ?? "",
          operatorId: auth.session.adminId,
          operatorName: auth.session.username,
        });

        result = {
          id: String(created._id),
          action,
          lessonCost,
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
          .select("status lessonTotal lessonUsed lessonLeft lessonGift")
          .lean();

        if (!student || student.status !== "active") {
          throw new Error("STUDENT_NOT_ACTIVE");
        }

        const nextLedger = applySignLedger(
          {
            lessonTotal: student.lessonTotal,
            lessonUsed: student.lessonUsed,
            lessonLeft: student.lessonLeft,
            lessonGift: student.lessonGift,
          },
          {
            action,
            costPerSign: action === "attend" ? 1 : 0,
          },
        );

        const lessonCost = action === "attend" ? 1 : 0;

        const created = await SignModel.create(
          [
            {
              idempotencyKey: idempotencyKey ?? null,
              studentId: body.studentId,
              signDate,
              signDateKey,
              action,
              lessonCost,
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
              updatedBy: auth.session.adminId,
            },
          },
          { session: session! },
        );

        result = {
          id: String(created[0]._id),
          action,
          lessonCost,
        };
      });
    }

    if (!result) {
      return errorResponse("INTERNAL_ERROR", "Sign transaction failed.", 500);
    }

    return successResponse(result, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "STUDENT_NOT_ACTIVE") {
      return errorResponse("INVALID_STUDENT", "Student not found or inactive.", 400);
    }

    if (message === "INSUFFICIENT_LESSON_OR_INACTIVE") {
      return errorResponse("INSUFFICIENT_LESSON", "Insufficient lessons left.", 409);
    }

    if (message.includes("Insufficient lessons left")) {
      return errorResponse("INSUFFICIENT_LESSON", "Insufficient lessons left.", 409);
    }

    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return errorResponse("DUPLICATE_SIGN", "Duplicate sign on the same day is not allowed.", 409);
    }

    if (isTransactionUnsupportedError(error)) {
      return errorResponse(
        "SIGN_FAILED",
        "Sign failed because MongoDB transactions are unavailable in the current deployment.",
        500,
      );
    }

    return errorResponse("SIGN_FAILED", "Sign operation failed.", 500, String(error));
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
