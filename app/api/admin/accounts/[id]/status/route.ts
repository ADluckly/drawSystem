import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { AdminModel } from "@/models/admin";

interface UpdateStatusBody {
  status?: "active" | "disabled";
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request, ["super"]);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as UpdateStatusBody | null;

  if (!body?.status || !["active", "disabled"].includes(body.status)) {
    return errorResponse("INVALID_REQUEST", "status must be active or disabled.", 400);
  }

  await connectMongoDB();

  const target = await AdminModel.findById(id).select("role status").lean();
  if (!target) {
    return errorResponse("NOT_FOUND", "Account not found.", 404);
  }

  if (target.role === "super") {
    return errorResponse("FORBIDDEN", "Super account status cannot be changed.", 403);
  }

  await AdminModel.updateOne(
    { _id: id },
    {
      $set: {
        status: body.status,
        updatedBy: auth.session.adminId,
        disabledAt: body.status === "disabled" ? new Date() : null,
        disabledBy: body.status === "disabled" ? auth.session.adminId : null,
      },
    },
  );

  return successResponse({ id, status: body.status });
}
