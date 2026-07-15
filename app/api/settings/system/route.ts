import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { getSystemConfig, updateSystemConfig } from "@/lib/business/system-config";
import { connectMongoDB } from "@/lib/mongodb";

interface SystemSettingsBody {
  defaultWarningThreshold?: number;
  exportMaxRecords?: number;
  exportMaxDays?: number;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  await connectMongoDB();
  const config = await getSystemConfig();

  return successResponse({
    defaultWarningThreshold: config.defaultWarningThreshold,
    exportMaxRecords: config.exportMaxRecords,
    exportMaxDays: config.exportMaxDays,
    updatedAt: config.updatedAt,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as SystemSettingsBody | null;
  if (!body) {
    return errorResponse("INVALID_REQUEST", "Request body is required.", 400);
  }

  if (
    (body.defaultWarningThreshold !== undefined && body.defaultWarningThreshold < 1) ||
    (body.exportMaxRecords !== undefined && body.exportMaxRecords < 100) ||
    (body.exportMaxDays !== undefined && body.exportMaxDays < 1)
  ) {
    return errorResponse("INVALID_REQUEST", "System settings are out of range.", 400);
  }

  await connectMongoDB();

  const updated = await updateSystemConfig(
    {
      defaultWarningThreshold: body.defaultWarningThreshold,
      exportMaxRecords: body.exportMaxRecords,
      exportMaxDays: body.exportMaxDays,
    },
    auth.session.adminId,
  );

  return successResponse({
    defaultWarningThreshold: updated.defaultWarningThreshold,
    exportMaxRecords: updated.exportMaxRecords,
    exportMaxDays: updated.exportMaxDays,
    updatedAt: updated.updatedAt,
  });
}