import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth/password";
import { requireApiSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { AdminModel } from "@/models/admin";

interface ResetPasswordBody {
  newPassword?: string;
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
  const body = (await request.json().catch(() => null)) as ResetPasswordBody | null;

  if (!body?.newPassword || body.newPassword.length < 8) {
    return errorResponse("INVALID_REQUEST", "newPassword length must be at least 8.", 400);
  }

  await connectMongoDB();

  const target = await AdminModel.findById(id).select("role").lean();
  if (!target) {
    return errorResponse("NOT_FOUND", "Account not found.", 404);
  }

  if (target.role === "super") {
    return errorResponse("FORBIDDEN", "Super account password cannot be reset via this API.", 403);
  }

  const passwordHash = await hashPassword(body.newPassword);

  await AdminModel.updateOne(
    { _id: id },
    {
      $set: {
        passwordHash,
        updatedBy: auth.session.adminId,
      },
    },
  );

  return successResponse({ id, reset: true });
}
