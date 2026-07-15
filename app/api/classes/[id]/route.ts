import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { AdminModel } from "@/models/admin";
import { ClassModel } from "@/models/class";

interface ClassUpdateBody {
  name?: string;
  code?: string;
  teacherId?: string | null;
  note?: string;
  status?: "active" | "inactive";
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as ClassUpdateBody | null;
  if (!body) {
    return errorResponse("INVALID_REQUEST", "Request body is required.", 400);
  }

  await connectMongoDB();

  const updateDoc: Record<string, unknown> = {};
  if (body.name !== undefined) updateDoc.name = body.name.trim();
  if (body.code !== undefined) updateDoc.code = body.code.trim().toUpperCase();
  if (body.note !== undefined) updateDoc.note = body.note.trim();
  if (body.status !== undefined) updateDoc.status = body.status;

  if (body.teacherId !== undefined) {
    if (body.teacherId === null || body.teacherId === "") {
      updateDoc.teacherId = null;
      updateDoc.teacherName = "";
    } else {
      const teacher = await AdminModel.findById(body.teacherId)
        .select("username role status")
        .lean();
      if (!teacher || teacher.role !== "teacher" || teacher.status !== "active") {
        return errorResponse("INVALID_TEACHER", "teacherId is invalid or inactive.", 400);
      }
      updateDoc.teacherId = body.teacherId;
      updateDoc.teacherName = teacher.username;
    }
  }

  const updated = await ClassModel.findByIdAndUpdate(id, { $set: updateDoc }, { new: true }).lean();
  if (!updated) {
    return errorResponse("NOT_FOUND", "Class not found.", 404);
  }

  return successResponse({
    id: String(updated._id),
    name: updated.name,
    code: updated.code,
    teacherId: updated.teacherId ? String(updated.teacherId) : null,
    teacherName: updated.teacherName || null,
    note: updated.note,
    status: updated.status,
  });
}