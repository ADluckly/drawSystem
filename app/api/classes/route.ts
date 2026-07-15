import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { AdminModel } from "@/models/admin";
import { ClassModel } from "@/models/class";
import { StudentModel } from "@/models/student";

interface ClassCreateBody {
  name?: string;
  code?: string;
  note?: string;
  teacherId?: string | null;
  status?: "active" | "inactive";
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  await connectMongoDB();

  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
  const query = includeInactive && auth.session.role !== "teacher" ? {} : { status: "active" };

  const [items, studentCounts] = await Promise.all([
    ClassModel.find(query).sort({ name: 1 }).lean(),
    StudentModel.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: "$classId", count: { $sum: 1 } } },
    ]),
  ]);

  const studentCountMap = new Map(studentCounts.map((item) => [String(item._id), item.count]));

  return successResponse({
    items: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      code: item.code,
      teacherId: item.teacherId ? String(item.teacherId) : null,
      teacherName: item.teacherName || null,
      note: item.note,
      status: item.status,
      studentCount: studentCountMap.get(String(item._id)) ?? 0,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as ClassCreateBody | null;
  if (!body?.name || !body?.code) {
    return errorResponse("INVALID_REQUEST", "name and code are required.", 400);
  }

  await connectMongoDB();

  let teacherName = "";
  if (body.teacherId) {
    const teacher = await AdminModel.findById(body.teacherId)
      .select("username role status")
      .lean();

    if (!teacher || teacher.role !== "teacher" || teacher.status !== "active") {
      return errorResponse("INVALID_TEACHER", "teacherId is invalid or inactive.", 400);
    }

    teacherName = teacher.username;
  }

  const created = await ClassModel.create({
    name: body.name.trim(),
    code: body.code.trim().toUpperCase(),
    teacherId: body.teacherId ?? null,
    teacherName,
    note: body.note?.trim() ?? "",
    status: body.status ?? "active",
  });

  return successResponse(
    {
      id: String(created._id),
      name: created.name,
      code: created.code,
      teacherId: created.teacherId ? String(created.teacherId) : null,
      teacherName: created.teacherName || null,
      note: created.note,
      status: created.status,
    },
    201,
  );
}
