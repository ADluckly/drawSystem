import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { buildSignFilter } from "@/lib/business/record-filters";
import { executeStudentSign } from "@/lib/business/sign-service";
import { connectMongoDB } from "@/lib/mongodb";
import { SignModel } from "@/models/sign";

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

  const query = await buildSignFilter({
    studentId: request.nextUrl.searchParams.get("studentId"),
    classId: request.nextUrl.searchParams.get("classId"),
    action: request.nextUrl.searchParams.get("action"),
    fromDate: request.nextUrl.searchParams.get("fromDate")
      ? new Date(request.nextUrl.searchParams.get("fromDate") as string)
      : undefined,
    toDate: request.nextUrl.searchParams.get("toDate")
      ? new Date(request.nextUrl.searchParams.get("toDate") as string)
      : undefined,
  });

  const items = await SignModel.find(query)
    .populate({ path: "studentId", select: "name mobile classId", populate: { path: "classId", select: "name" } })
    .sort({ signDate: -1 })
    .limit(200)
    .lean();

  return successResponse({
    items: items.map((item) => {
      const studentRef = item.studentId as unknown as
        | { _id: unknown; name: string; mobile: string; classId?: { name: string } | null }
        | undefined;

      return {
        id: String(item._id),
        student: studentRef
          ? {
              id: String(studentRef._id),
              name: studentRef.name,
              mobile: studentRef.mobile,
              className: studentRef.classId?.name ?? null,
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

  if (!["attend", "leave"].includes(body.action)) {
    return errorResponse("INVALID_REQUEST", "action must be attend or leave.", 400);
  }
  const result = await executeStudentSign({
    studentId: body.studentId,
    action: body.action,
    signDate: body.signDate,
    note: body.note,
    idempotencyKey: request.headers.get("x-idempotency-key") ?? undefined,
    actor: {
      adminId: auth.session.adminId,
      username: auth.session.username,
    },
  });

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      INVALID_REQUEST: 400,
      INVALID_STUDENT: 400,
      DUPLICATE_SIGN: 409,
      INSUFFICIENT_LESSON: 409,
      SIGN_FAILED: 500,
    };

    return errorResponse(result.code, result.message, statusMap[result.code] ?? 500);
  }

  return successResponse(result, 201);
}
