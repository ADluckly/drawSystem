import dayjs from "dayjs";
import mongoose, { isValidObjectId } from "mongoose";

import { applySignLedger } from "@/lib/business/lesson-ledger";
import {
  connectMongoDB,
  isTransactionUnsupportedError,
  supportsMongoTransactions,
} from "@/lib/mongodb";
import { SignModel } from "@/models/sign";
import { StudentModel } from "@/models/student";

export interface ExecuteSignInput {
  studentId: string;
  action: "attend" | "leave";
  signDate?: string;
  note?: string;
  idempotencyKey?: string;
  actor: {
    adminId: string;
    username: string;
  };
}

export type ExecuteSignResult =
  | { ok: true; id: string; action: "attend" | "leave"; lessonCost: number; idempotent?: boolean }
  | { ok: false; code: string; message: string };

export function normalizeSignDate(signDate?: string) {
  const signDay = signDate ? dayjs(signDate) : dayjs();
  if (!signDay.isValid()) {
    return null;
  }

  return {
    signDate: signDay.startOf("day").toDate(),
    signDateKey: signDay.format("YYYY-MM-DD"),
  };
}

export async function executeStudentSign(input: ExecuteSignInput): Promise<ExecuteSignResult> {
  if (!isValidObjectId(input.studentId)) {
    return { ok: false, code: "INVALID_REQUEST", message: "studentId is invalid." };
  }

  const normalized = normalizeSignDate(input.signDate);
  if (!normalized) {
    return { ok: false, code: "INVALID_REQUEST", message: "signDate is invalid." };
  }

  await connectMongoDB();

  if (input.idempotencyKey) {
    const existedByIdempotency = await SignModel.findOne({ idempotencyKey: input.idempotencyKey }).lean();
    if (existedByIdempotency) {
      return {
        ok: true,
        id: String(existedByIdempotency._id),
        action: existedByIdempotency.action,
        lessonCost: existedByIdempotency.lessonCost,
        idempotent: true,
      };
    }
  }

  const duplicated = await SignModel.findOne({
    studentId: input.studentId,
    signDateKey: normalized.signDateKey,
  })
    .select("_id")
    .lean();
  if (duplicated) {
    return {
      ok: false,
      code: "DUPLICATE_SIGN",
      message: "Duplicate sign on the same day is not allowed.",
    };
  }

  const useTransactions = await supportsMongoTransactions();
  const session = useTransactions ? await mongoose.startSession() : null;

  try {
    let result: ExecuteSignResult | null = null;

    if (!useTransactions) {
      const student = await StudentModel.findById(input.studentId)
        .select("name status lessonTotal lessonUsed lessonLeft lessonGift")
        .lean();

      if (!student || student.status !== "active") {
        return { ok: false, code: "INVALID_STUDENT", message: "Student not found or inactive." };
      }

      const lessonCost = input.action === "attend" ? 1 : 0;
      const nextLedger = applySignLedger(
        {
          lessonTotal: student.lessonTotal,
          lessonUsed: student.lessonUsed,
          lessonLeft: student.lessonLeft,
          lessonGift: student.lessonGift,
        },
        { action: input.action, costPerSign: lessonCost },
      );

      const updateResult = await StudentModel.updateOne(
        {
          _id: input.studentId,
          status: "active",
          ...(input.action === "attend" ? { lessonLeft: { $gte: lessonCost } } : {}),
        },
        {
          $set: {
            lessonTotal: nextLedger.lessonTotal,
            lessonUsed: nextLedger.lessonUsed,
            lessonLeft: nextLedger.lessonLeft,
            lessonGift: nextLedger.lessonGift,
            updatedBy: input.actor.adminId,
          },
        },
      );

      if (!updateResult.matchedCount) {
        return { ok: false, code: "INSUFFICIENT_LESSON", message: "Insufficient lessons left." };
      }

      try {
        const created = await SignModel.create({
          idempotencyKey: input.idempotencyKey ?? null,
          studentId: input.studentId,
          signDate: normalized.signDate,
          signDateKey: normalized.signDateKey,
          action: input.action,
          lessonCost,
          note: input.note?.trim() ?? "",
          operatorId: input.actor.adminId,
          operatorName: input.actor.username,
        });

        result = { ok: true, id: String(created._id), action: input.action, lessonCost };
      } catch (createError) {
        await StudentModel.updateOne(
          { _id: input.studentId },
          {
            $set: {
              lessonTotal: student.lessonTotal,
              lessonUsed: student.lessonUsed,
              lessonLeft: student.lessonLeft,
              lessonGift: student.lessonGift,
              updatedBy: input.actor.adminId,
            },
          },
        );
        throw createError;
      }
    } else {
      await session!.withTransaction(async () => {
        const student = await StudentModel.findById(input.studentId)
          .session(session!)
          .select("status lessonTotal lessonUsed lessonLeft lessonGift")
          .lean();

        if (!student || student.status !== "active") {
          result = { ok: false, code: "INVALID_STUDENT", message: "Student not found or inactive." };
          return;
        }

        const lessonCost = input.action === "attend" ? 1 : 0;
        const nextLedger = applySignLedger(
          {
            lessonTotal: student.lessonTotal,
            lessonUsed: student.lessonUsed,
            lessonLeft: student.lessonLeft,
            lessonGift: student.lessonGift,
          },
          { action: input.action, costPerSign: lessonCost },
        );

        const created = await SignModel.create(
          [
            {
              idempotencyKey: input.idempotencyKey ?? null,
              studentId: input.studentId,
              signDate: normalized.signDate,
              signDateKey: normalized.signDateKey,
              action: input.action,
              lessonCost,
              note: input.note?.trim() ?? "",
              operatorId: input.actor.adminId,
              operatorName: input.actor.username,
            },
          ],
          { session: session! },
        );

        await StudentModel.updateOne(
          { _id: input.studentId },
          {
            $set: {
              lessonTotal: nextLedger.lessonTotal,
              lessonUsed: nextLedger.lessonUsed,
              lessonLeft: nextLedger.lessonLeft,
              lessonGift: nextLedger.lessonGift,
              updatedBy: input.actor.adminId,
            },
          },
          { session: session! },
        );

        result = { ok: true, id: String(created[0]._id), action: input.action, lessonCost };
      });
    }

    if (!result) {
      return { ok: false, code: "SIGN_FAILED", message: "Sign operation failed." };
    }

    return result;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return {
        ok: false,
        code: "DUPLICATE_SIGN",
        message: "Duplicate sign on the same day is not allowed.",
      };
    }

    if (isTransactionUnsupportedError(error)) {
      return {
        ok: false,
        code: "SIGN_FAILED",
        message: "Sign failed because MongoDB transactions are unavailable in the current deployment.",
      };
    }

    return {
      ok: false,
      code: "SIGN_FAILED",
      message: error instanceof Error ? error.message : "Sign operation failed.",
    };
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}