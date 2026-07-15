import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { buildStudentFilterQuery } from "@/lib/business/student-filters";
import { connectMongoDB } from "@/lib/mongodb";
import { RechargeModel } from "@/models/recharge";
import { SignModel } from "@/models/sign";
import { StudentModel } from "@/models/student";

interface StudentUpdateBody {
  name?: string;
  mobile?: string;
  gender?: "male" | "female" | "other";
  classId?: string | null;
  warningThreshold?: number;
  note?: string;
  status?: "active" | "inactive";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  await connectMongoDB();

  const student = await StudentModel.findById(id).populate("classId", "name code").lean();
  if (!student) return errorResponse("NOT_FOUND", "Student not found.", 404);

  const classRef = student.classId as unknown as
    | { _id: unknown; name: string; code: string }
    | undefined;

  const filter = buildStudentFilterQuery({});
  const [recharges, signs] = await Promise.all([
    RechargeModel.find({ ...filter, studentId: id })
      .select("serialNo packageName lessonAdded giftAdded amount paymentMethod createdAt note")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
    SignModel.find({ ...filter, studentId: id })
      .select("signDate signDateKey action lessonCost note createdAt")
      .sort({ signDate: -1 })
      .limit(30)
      .lean(),
  ]);

  return successResponse({
    student: {
      id: String(student._id),
      name: student.name,
      mobile: student.mobile,
      gender: student.gender,
      classInfo: classRef
        ? {
            id: String(classRef._id),
            name: classRef.name,
            code: classRef.code,
          }
        : null,
      status: student.status,
      lessonTotal: student.lessonTotal,
      lessonUsed: student.lessonUsed,
      lessonLeft: student.lessonLeft,
      lessonGift: student.lessonGift,
      lessonExpireAt: student.lessonExpireAt,
      warningThreshold: student.warningThreshold,
      note: student.note,
      createdAt: student.createdAt,
    },
    recharges: recharges.map((item) => ({
      id: String(item._id),
      serialNo: item.serialNo,
      packageName: item.packageName,
      lessonAdded: item.lessonAdded,
      giftAdded: item.giftAdded,
      amount: item.amount,
      paymentMethod: item.paymentMethod,
      note: item.note,
      createdAt: item.createdAt,
    })),
    signs: signs.map((item) => ({
      id: String(item._id),
      signDate: item.signDate,
      signDateKey: item.signDateKey,
      action: item.action,
      lessonCost: item.lessonCost,
      note: item.note,
      createdAt: item.createdAt,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as StudentUpdateBody | null;
  if (!body) return errorResponse("INVALID_REQUEST", "Request body is required.", 400);

  const updateDoc: Record<string, unknown> = { updatedBy: auth.session.adminId };

  if (body.name !== undefined) updateDoc.name = body.name.trim();
  if (body.mobile !== undefined) updateDoc.mobile = body.mobile.trim();
  if (body.gender !== undefined) updateDoc.gender = body.gender;
  if (body.classId !== undefined) updateDoc.classId = body.classId;
  if (body.warningThreshold !== undefined) updateDoc.warningThreshold = body.warningThreshold;
  if (body.note !== undefined) updateDoc.note = body.note.trim();
  if (body.status !== undefined) updateDoc.status = body.status;

  await connectMongoDB();

  const updated = await StudentModel.findByIdAndUpdate(id, { $set: updateDoc }, { new: true }).lean();
  if (!updated) return errorResponse("NOT_FOUND", "Student not found.", 404);

  return successResponse({
    id: String(updated._id),
    name: updated.name,
    mobile: updated.mobile,
    status: updated.status,
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  await connectMongoDB();

  const [rechargeCount, signCount] = await Promise.all([
    RechargeModel.countDocuments({ studentId: id }),
    SignModel.countDocuments({ studentId: id }),
  ]);

  if (rechargeCount > 0 || signCount > 0) {
    return errorResponse(
      "FORBIDDEN",
      "Student with recharge/sign history cannot be deleted. Set status to inactive instead.",
      409,
    );
  }

  const deleted = await StudentModel.findByIdAndDelete(id).select("_id").lean();
  if (!deleted) return errorResponse("NOT_FOUND", "Student not found.", 404);

  return successResponse({ id });
}
