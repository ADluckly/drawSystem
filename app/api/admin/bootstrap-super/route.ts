import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";
import { connectMongoDB } from "@/lib/mongodb";
import { AdminModel } from "@/models/admin";

interface BootstrapBody {
  bootstrapKey?: string;
  username?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as BootstrapBody | null;

  if (!body?.bootstrapKey || !body?.username || !body?.password) {
    return errorResponse("INVALID_REQUEST", "bootstrapKey, username and password are required.", 400);
  }

  if (!env.BOOTSTRAP_SUPER_KEY || body.bootstrapKey !== env.BOOTSTRAP_SUPER_KEY) {
    return errorResponse("FORBIDDEN", "Invalid bootstrap key.", 403);
  }

  const username = body.username.trim().toLowerCase();
  if (username.length < 3 || username.length > 32 || body.password.length < 8) {
    return errorResponse("INVALID_REQUEST", "Invalid username/password format.", 400);
  }

  await connectMongoDB();

  const superCount = await AdminModel.countDocuments({ role: "super" });
  if (superCount > 0) {
    return errorResponse("ALREADY_INITIALIZED", "Super account already exists.", 409);
  }

  const passwordHash = await hashPassword(body.password);

  const created = await AdminModel.create({
    username,
    passwordHash,
    role: "super",
    status: "active",
  });

  return successResponse(
    {
      id: String(created._id),
      username: created.username,
      role: created.role,
    },
    201,
  );
}
