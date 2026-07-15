import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { getSystemConfig } from "@/lib/business/system-config";
import { buildStudentFilterQuery } from "@/lib/business/student-filters";
import { connectMongoDB } from "@/lib/mongodb";
import { ClassModel } from "@/models/class";
import { StudentModel } from "@/models/student";

interface StudentCreateBody {
  name?: string;
  mobile?: string;
  gender?: "male" | "female" | "other";
  classId?: string;
  warningThreshold?: number;
  note?: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  const searchParams = request.nextUrl.searchParams;
  const query = buildStudentFilterQuery({
    keyword: searchParams.get("keyword") ?? undefined,
    mobile: searchParams.get("mobile") ?? undefined,
    classId: searchParams.get("classId") ?? undefined,
    lessonStatus: (searchParams.get("lessonStatus") as "low" | "normal" | null) ?? undefined,
    status: (searchParams.get("status") as "active" | "inactive" | null) ?? "active",
  });

  await connectMongoDB();

  const students = await StudentModel.find(query)
    .populate("classId", "name code")
    .sort({ createdAt: -1 })
    .lean();

  return successResponse({
    items: students.map((item) => {
      const classRef = item.classId as unknown as
        | { _id: unknown; name: string; code: string }
        | undefined;

      return {
        id: String(item._id),
        name: item.name,
        mobile: item.mobile,
        gender: item.gender,
        classInfo: classRef
          ? {
              id: String(classRef._id),
              name: classRef.name,
              code: classRef.code,
            }
          : null,
        status: item.status,
        lessonTotal: item.lessonTotal,
        lessonUsed: item.lessonUsed,
        lessonLeft: item.lessonLeft,
        lessonGift: item.lessonGift,
        lessonExpireAt: item.lessonExpireAt,
        warningThreshold: item.warningThreshold,
        createdAt: item.createdAt,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as StudentCreateBody | null;
  if (!body?.name || !body?.mobile) {
    return errorResponse("INVALID_REQUEST", "name and mobile are required.", 400);
  }

  await connectMongoDB();

  const systemConfig = await getSystemConfig();

  if (body.classId) {
    const klass = await ClassModel.findById(body.classId).select("_id status").lean();
    if (!klass || klass.status !== "active") {
      return errorResponse("INVALID_CLASS", "classId is invalid or inactive.", 400);
    }
  }

  const created = await StudentModel.create({
    name: body.name.trim(),
    mobile: body.mobile.trim(),
    gender: body.gender ?? "other",
    classId: body.classId ?? null,
    warningThreshold: body.warningThreshold ?? systemConfig.defaultWarningThreshold,
    note: body.note?.trim() ?? "",
    status: "active",
    lessonTotal: 0,
    lessonUsed: 0,
    lessonLeft: 0,
    lessonGift: 0,
    lessonExpireAt: null,
    createdBy: auth.session.adminId,
    updatedBy: auth.session.adminId,
  });

  return successResponse(
    {
      id: String(created._id),
      name: created.name,
      mobile: created.mobile,
      status: created.status,
    },
    201,
  );
}
