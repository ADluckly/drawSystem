import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { executeStudentSign, normalizeSignDate } from "@/lib/business/sign-service";
import { connectMongoDB } from "@/lib/mongodb";
import { BatchSignJobModel } from "@/models/batch-sign-job";
import { ClassModel } from "@/models/class";
import { StudentModel } from "@/models/student";

interface BatchSignBody {
  classId?: string;
  studentIds?: string[];
  signDate?: string;
  action?: "attend" | "leave";
  note?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as BatchSignBody | null;
  const idempotencyKey = request.headers.get("x-idempotency-key") ?? undefined;

  if (!idempotencyKey) {
    return errorResponse("INVALID_REQUEST", "x-idempotency-key is required for batch sign.", 400);
  }

  if (!body?.classId || !body.action) {
    return errorResponse("INVALID_REQUEST", "classId and action are required.", 400);
  }

  if (!isValidObjectId(body.classId)) {
    return errorResponse("INVALID_REQUEST", "classId is invalid.", 400);
  }

  const normalized = normalizeSignDate(body.signDate);
  if (!normalized) {
    return errorResponse("INVALID_REQUEST", "signDate is invalid.", 400);
  }

  await connectMongoDB();

  const existingJob = await BatchSignJobModel.findOne({ idempotencyKey }).lean();
  if (existingJob) {
    return successResponse({
      id: String(existingJob._id),
      totalCount: existingJob.totalCount,
      successCount: existingJob.successCount,
      failureCount: existingJob.failureCount,
      failures: existingJob.failures.map((item) => ({
        studentId: String(item.studentId),
        studentName: item.studentName,
        code: item.code,
        message: item.message,
      })),
      status: existingJob.status,
      partialSuccess: existingJob.failureCount > 0,
      idempotent: true,
    });
  }

  const klass = await ClassModel.findById(body.classId).select("name status").lean();
  if (!klass || klass.status !== "active") {
    return errorResponse("INVALID_CLASS", "Class not found or inactive.", 400);
  }

  const requestedIds = (body.studentIds ?? []).filter((item) => isValidObjectId(item));
  const studentQuery: Record<string, unknown> = { classId: body.classId, status: "active" };
  if (requestedIds.length > 0) {
    studentQuery._id = { $in: requestedIds };
  }

  const students = await StudentModel.find(studentQuery).select("name").sort({ name: 1 }).lean();
  if (!students.length) {
    return errorResponse("EMPTY_BATCH", "No active students found for the selected class.", 400);
  }

  let job;
  try {
    job = await BatchSignJobModel.create({
      idempotencyKey,
      classId: body.classId,
      signDateKey: normalized.signDateKey,
      action: body.action,
      requestedStudentIds: students.map((item) => item._id),
      totalCount: students.length,
      successCount: 0,
      failureCount: 0,
      failures: [],
      status: "processing",
      operatorId: auth.session.adminId,
      operatorName: auth.session.username,
    });
  } catch {
    const duplicatedJob = await BatchSignJobModel.findOne({ idempotencyKey }).lean();
    if (duplicatedJob) {
      return successResponse({
        id: String(duplicatedJob._id),
        totalCount: duplicatedJob.totalCount,
        successCount: duplicatedJob.successCount,
        failureCount: duplicatedJob.failureCount,
        failures: duplicatedJob.failures.map((item) => ({
          studentId: String(item.studentId),
          studentName: item.studentName,
          code: item.code,
          message: item.message,
        })),
        status: duplicatedJob.status,
        partialSuccess: duplicatedJob.failureCount > 0,
        idempotent: true,
      });
    }

    return errorResponse("BATCH_SIGN_FAILED", "Unable to create batch sign job.", 500);
  }

  const failures: Array<{ studentId: string; studentName: string; code: string; message: string }> = [];
  let successCount = 0;

  for (const student of students) {
    const result = await executeStudentSign({
      studentId: String(student._id),
      action: body.action,
      signDate: normalized.signDateKey,
      note: body.note,
      actor: {
        adminId: auth.session.adminId,
        username: auth.session.username,
      },
    });

    if (result.ok) {
      successCount += 1;
      continue;
    }

    failures.push({
      studentId: String(student._id),
      studentName: student.name,
      code: result.code,
      message: result.message,
    });
  }

  const updatedJob = await BatchSignJobModel.findByIdAndUpdate(
    job._id,
    {
      $set: {
        successCount,
        failureCount: failures.length,
        failures,
        status: "completed",
      },
    },
    { new: true },
  ).lean();

  return successResponse({
    id: String(updatedJob?._id ?? job._id),
    totalCount: students.length,
    successCount,
    failureCount: failures.length,
    failures,
    status: updatedJob?.status ?? "completed",
    partialSuccess: failures.length > 0,
  });
}