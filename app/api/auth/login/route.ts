import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/api-response";
import { setAuthCookie } from "@/lib/auth/cookies";
import { signAuthToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { connectMongoDB } from "@/lib/mongodb";
import { AdminModel } from "@/models/admin";

interface LoginRequestBody {
  username?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as LoginRequestBody | null;

  if (!body?.username || !body?.password) {
    return errorResponse("INVALID_REQUEST", "Username and password are required.", 400);
  }

  const username = body.username.trim().toLowerCase();
  const password = body.password;

  if (username.length < 3 || username.length > 32 || password.length < 8) {
    return errorResponse("INVALID_CREDENTIALS_FORMAT", "Invalid credential format.", 400);
  }

  await connectMongoDB();

  const admin = await AdminModel.findOne({ username })
    .select("username passwordHash role status")
    .lean();

  if (!admin) {
    return errorResponse("LOGIN_FAILED", "Invalid username or password.", 401);
  }

  if (admin.status !== "active") {
    return errorResponse("ACCOUNT_DISABLED", "This account has been disabled.", 403);
  }

  const matched = await verifyPassword(password, admin.passwordHash);
  if (!matched) {
    return errorResponse("LOGIN_FAILED", "Invalid username or password.", 401);
  }

  const token = signAuthToken({
    adminId: String(admin._id),
    username: admin.username,
    role: admin.role,
  });

  await AdminModel.updateOne(
    { _id: admin._id },
    {
      $set: {
        lastLoginAt: new Date(),
      },
    },
  );

  const response = successResponse({
    user: {
      id: String(admin._id),
      username: admin.username,
      role: admin.role,
    },
  });

  setAuthCookie(response, token);
  return response;
}
