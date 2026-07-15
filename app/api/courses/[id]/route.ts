import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { CourseModel } from "@/models/course";

interface CourseUpdateBody {
  name?: string;
  category?: string;
  lessonCount?: number;
  giftLesson?: number;
  amount?: number;
  expireDays?: number;
  note?: string;
  status?: "active" | "inactive";
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as CourseUpdateBody | null;
  if (!body) {
    return errorResponse("INVALID_REQUEST", "Request body is required.", 400);
  }

  const updateDoc: Record<string, unknown> = {};
  if (body.name !== undefined) updateDoc.name = body.name.trim();
  if (body.category !== undefined) updateDoc.category = body.category.trim();
  if (body.lessonCount !== undefined) updateDoc.lessonCount = body.lessonCount;
  if (body.giftLesson !== undefined) updateDoc.giftLesson = body.giftLesson;
  if (body.amount !== undefined) updateDoc.amount = body.amount;
  if (body.expireDays !== undefined) updateDoc.expireDays = body.expireDays;
  if (body.note !== undefined) updateDoc.note = body.note.trim();
  if (body.status !== undefined) updateDoc.status = body.status;

  await connectMongoDB();

  const updated = await CourseModel.findByIdAndUpdate(id, { $set: updateDoc }, { new: true }).lean();
  if (!updated) {
    return errorResponse("NOT_FOUND", "Course not found.", 404);
  }

  return successResponse({
    id: String(updated._id),
    name: updated.name,
    category: updated.category,
    lessonCount: updated.lessonCount,
    giftLesson: updated.giftLesson,
    amount: updated.amount,
    expireDays: updated.expireDays,
    note: updated.note,
    status: updated.status,
  });
}