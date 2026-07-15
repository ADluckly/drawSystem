import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

import { errorResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { parseDateWindow } from "@/lib/business/date-window";
import { buildRechargeFilter, buildSignFilter } from "@/lib/business/record-filters";
import { getSystemConfig } from "@/lib/business/system-config";
import { buildStudentFilterQuery } from "@/lib/business/student-filters";
import { connectMongoDB } from "@/lib/mongodb";
import { RechargeModel } from "@/models/recharge";
import { SignModel } from "@/models/sign";
import { StudentModel } from "@/models/student";

function workbookResponse(filename: string, sheetName: string, rows: Array<Record<string, unknown>>) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  const { type } = await context.params;

  await connectMongoDB();
  const systemConfig = await getSystemConfig();

  try {
    if (type === "recharges") {
      const window = parseDateWindow({
        from: request.nextUrl.searchParams.get("fromDate"),
        to: request.nextUrl.searchParams.get("toDate"),
        fallbackMode: "month",
        maxDays: systemConfig.exportMaxDays,
      });

      const query = await buildRechargeFilter({
        studentId: request.nextUrl.searchParams.get("studentId"),
        classId: request.nextUrl.searchParams.get("classId"),
        paymentMethod: request.nextUrl.searchParams.get("paymentMethod"),
        fromDate: window.fromDate,
        toDate: window.toDate,
      });

      const items = await RechargeModel.find(query)
        .populate({ path: "studentId", select: "name mobile classId", populate: { path: "classId", select: "name" } })
        .sort({ createdAt: -1 })
        .limit(systemConfig.exportMaxRecords)
        .lean();

      return workbookResponse(
        `recharges-${window.fromDateKey}-${window.toDateKey}.xlsx`,
        "Recharges",
        items.map((item) => {
          const studentRef = item.studentId as unknown as
            | { name: string; mobile: string; classId?: { name: string } | null }
            | undefined;
          return {
            流水号: item.serialNo,
            学员姓名: studentRef?.name ?? "-",
            手机号: studentRef?.mobile ?? "-",
            班级: studentRef?.classId?.name ?? "-",
            套餐: item.packageName,
            课时: item.lessonAdded,
            赠送: item.giftAdded,
            金额: item.amount,
            支付方式: item.paymentMethod,
            备注: item.note,
            创建时间: item.createdAt,
          };
        }),
      );
    }

    if (type === "signs") {
      const window = parseDateWindow({
        from: request.nextUrl.searchParams.get("fromDate"),
        to: request.nextUrl.searchParams.get("toDate"),
        fallbackMode: "month",
        maxDays: systemConfig.exportMaxDays,
      });

      const query = await buildSignFilter({
        studentId: request.nextUrl.searchParams.get("studentId"),
        classId: request.nextUrl.searchParams.get("classId"),
        action: request.nextUrl.searchParams.get("action"),
        fromDate: window.fromDate,
        toDate: window.toDate,
      });

      const items = await SignModel.find(query)
        .populate({ path: "studentId", select: "name mobile classId", populate: { path: "classId", select: "name" } })
        .sort({ signDate: -1 })
        .limit(systemConfig.exportMaxRecords)
        .lean();

      return workbookResponse(
        `signs-${window.fromDateKey}-${window.toDateKey}.xlsx`,
        "Signs",
        items.map((item) => {
          const studentRef = item.studentId as unknown as
            | { name: string; mobile: string; classId?: { name: string } | null }
            | undefined;
          return {
            学员姓名: studentRef?.name ?? "-",
            手机号: studentRef?.mobile ?? "-",
            班级: studentRef?.classId?.name ?? "-",
            打卡日期: item.signDateKey,
            动作: item.action,
            扣课: item.lessonCost,
            备注: item.note,
            创建时间: item.createdAt,
          };
        }),
      );
    }

    if (type === "students") {
      const query = buildStudentFilterQuery({
        keyword: request.nextUrl.searchParams.get("keyword") ?? undefined,
        mobile: request.nextUrl.searchParams.get("mobile") ?? undefined,
        classId: request.nextUrl.searchParams.get("classId") ?? undefined,
        lessonStatus: (request.nextUrl.searchParams.get("lessonStatus") as "low" | "normal" | null) ?? undefined,
        status: (request.nextUrl.searchParams.get("status") as "active" | "inactive" | null) ?? "active",
      });

      const items = await StudentModel.find(query)
        .populate("classId", "name code")
        .sort({ createdAt: -1 })
        .limit(systemConfig.exportMaxRecords)
        .lean();

      return workbookResponse(
        `students-overview-${Date.now()}.xlsx`,
        "Students",
        items.map((item) => {
          const classRef = item.classId as unknown as { name: string; code: string } | undefined;
          return {
            姓名: item.name,
            手机号: item.mobile,
            班级: classRef?.name ?? "-",
            班级编码: classRef?.code ?? "-",
            状态: item.status,
            总课时: item.lessonTotal,
            已用课时: item.lessonUsed,
            剩余课时: item.lessonLeft,
            赠送课时: item.lessonGift,
            预警阈值: item.warningThreshold,
            到期时间: item.lessonExpireAt,
            创建时间: item.createdAt,
          };
        }),
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DATE_RANGE") {
      return errorResponse("INVALID_REQUEST", "Invalid export date range.", 400);
    }

    if (error instanceof Error && error.message === "DATE_RANGE_TOO_LARGE") {
      return errorResponse("DATE_RANGE_TOO_LARGE", "Export date range exceeds configured limit.", 400);
    }

    return errorResponse("EXPORT_FAILED", "Export failed.", 500, String(error));
  }

  return errorResponse("NOT_FOUND", "Unsupported export type.", 404);
}