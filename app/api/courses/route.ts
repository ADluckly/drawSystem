import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { CourseModel } from "@/models/course";

interface CourseCreateBody {
  name?: string;
  lessonCount?: number;
  giftLesson?: number;
  amount?: number;
  expireDays?: number;
  note?: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  await connectMongoDB();

  const items = await CourseModel.find({ status: "active" }).sort({ amount: 1 }).lean();

  return successResponse({
    items: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      lessonCount: item.lessonCount,
      giftLesson: item.giftLesson,
      amount: item.amount,
      expireDays: item.expireDays,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as CourseCreateBody | null;
  if (!body?.name || body.lessonCount === undefined || body.amount === undefined) {
    return errorResponse("INVALID_REQUEST", "name, lessonCount and amount are required.", 400);
  }

  if (body.lessonCount < 0 || body.amount < 0 || (body.giftLesson ?? 0) < 0) {
    return errorResponse("INVALID_REQUEST", "lessonCount/amount/giftLesson must be >= 0.", 400);
  }

  await connectMongoDB();

  const created = await CourseModel.create({
    name: body.name.trim(),
    lessonCount: body.lessonCount,
    giftLesson: body.giftLesson ?? 0,
    amount: body.amount,
    expireDays: body.expireDays ?? 365,
    note: body.note?.trim() ?? "",
    status: "active",
  });

  return successResponse(
    {
      id: String(created._id),
      name: created.name,
      lessonCount: created.lessonCount,
      giftLesson: created.giftLesson,
      amount: created.amount,
      expireDays: created.expireDays,
    },
    201,
  );
}
