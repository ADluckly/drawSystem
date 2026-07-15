import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { CourseModel } from "@/models/course";

interface CourseCreateBody {
  name?: string;
  category?: string;
  lessonCount?: number;
  giftLesson?: number;
  amount?: number;
  expireDays?: number;
  note?: string;
  status?: "active" | "inactive";
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  await connectMongoDB();

  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
  const query = includeInactive && auth.session.role !== "teacher" ? {} : { status: "active" };

  const items = await CourseModel.find(query).sort({ category: 1, amount: 1, createdAt: -1 }).lean();

  return successResponse({
    items: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      category: item.category,
      lessonCount: item.lessonCount,
      giftLesson: item.giftLesson,
      amount: item.amount,
      expireDays: item.expireDays,
      note: item.note,
      status: item.status,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as CourseCreateBody | null;
  if (!body?.name || !body.category || body.lessonCount === undefined || body.amount === undefined) {
    return errorResponse(
      "INVALID_REQUEST",
      "name, category, lessonCount and amount are required.",
      400,
    );
  }

  if (body.lessonCount < 0 || body.amount < 0 || (body.giftLesson ?? 0) < 0) {
    return errorResponse("INVALID_REQUEST", "lessonCount/amount/giftLesson must be >= 0.", 400);
  }

  await connectMongoDB();

  const created = await CourseModel.create({
    name: body.name.trim(),
    category: body.category.trim(),
    lessonCount: body.lessonCount,
    giftLesson: body.giftLesson ?? 0,
    amount: body.amount,
    expireDays: body.expireDays ?? 365,
    note: body.note?.trim() ?? "",
    status: body.status ?? "active",
  });

  return successResponse(
    {
      id: String(created._id),
      name: created.name,
      category: created.category,
      lessonCount: created.lessonCount,
      giftLesson: created.giftLesson,
      amount: created.amount,
      expireDays: created.expireDays,
      note: created.note,
      status: created.status,
    },
    201,
  );
}
