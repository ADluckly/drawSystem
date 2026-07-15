import dayjs from "dayjs";
import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { parseDateWindow } from "@/lib/business/date-window";
import { connectMongoDB } from "@/lib/mongodb";
import { RechargeModel } from "@/models/recharge";
import { SignModel } from "@/models/sign";
import { StudentModel } from "@/models/student";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  const range = request.nextUrl.searchParams.get("range") === "day" ? "day" : "month";
  const baseDate = request.nextUrl.searchParams.get("date");
  const parsedBase = baseDate ? dayjs(baseDate) : dayjs();

  if (!parsedBase.isValid()) {
    return errorResponse("INVALID_REQUEST", "date is invalid.", 400);
  }

  const from = range === "day" ? parsedBase.startOf("day") : parsedBase.startOf("month");
  const to = range === "day" ? parsedBase.endOf("day") : parsedBase.endOf("month");

  await connectMongoDB();

  const window = parseDateWindow({
    from: from.format("YYYY-MM-DD"),
    to: to.format("YYYY-MM-DD"),
    maxDays: range === "day" ? 1 : 31,
  });

  const [
    revenueRows,
    consumedRows,
    newStudents,
    warningCount,
    priorRechargeStudentIds,
    currentRechargeStudentIds,
    paymentBreakdown,
  ] = await Promise.all([
    RechargeModel.aggregate<{ totalAmount: number }>([
      { $match: { createdAt: { $gte: window.fromDate, $lte: window.toDate } } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]),
    SignModel.aggregate<{ totalCost: number }>([
      { $match: { signDate: { $gte: window.fromDate, $lte: window.toDate } } },
      { $group: { _id: null, totalCost: { $sum: "$lessonCost" } } },
    ]),
    StudentModel.countDocuments({ createdAt: { $gte: window.fromDate, $lte: window.toDate } }),
    StudentModel.countDocuments({ status: "active", $expr: { $lte: ["$lessonLeft", "$warningThreshold"] } }),
    RechargeModel.distinct("studentId", { createdAt: { $lt: window.fromDate } }),
    RechargeModel.distinct("studentId", { createdAt: { $gte: window.fromDate, $lte: window.toDate } }),
    RechargeModel.aggregate<{ _id: string; amount: number }>([
      { $match: { createdAt: { $gte: window.fromDate, $lte: window.toDate } } },
      { $group: { _id: "$paymentMethod", amount: { $sum: "$amount" } } },
      { $sort: { amount: -1 } },
    ]),
  ]);

  const priorSet = new Set(priorRechargeStudentIds.map((item) => String(item)));
  const renewalCount = currentRechargeStudentIds.filter((item) => priorSet.has(String(item))).length;

  return successResponse({
    range,
    fromDate: window.fromDateKey,
    toDate: window.toDateKey,
    summary: {
      revenue: revenueRows[0]?.totalAmount ?? 0,
      consumedLessons: consumedRows[0]?.totalCost ?? 0,
      newStudents,
      renewals: renewalCount,
      warnings: warningCount,
    },
    paymentBreakdown: paymentBreakdown.map((item) => ({
      paymentMethod: item._id,
      amount: item.amount,
    })),
  });
}