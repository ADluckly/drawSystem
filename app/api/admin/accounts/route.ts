import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth/password";
import { requireApiSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { ADMIN_ROLES, AdminModel } from "@/models/admin";

interface CreateAccountBody {
  username?: string;
  password?: string;
  role?: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super"]);
  if (!auth.ok) {
    return auth.response;
  }

  await connectMongoDB();

  const accounts = await AdminModel.find({})
    .select("username role status lastLoginAt createdAt createdBy updatedAt updatedBy disabledAt disabledBy")
    .sort({ createdAt: -1 })
    .lean();

  return successResponse({
    items: accounts.map((item) => ({
      id: String(item._id),
      username: item.username,
      role: item.role,
      status: item.status,
      lastLoginAt: item.lastLoginAt,
      createdAt: item.createdAt,
      createdBy: item.createdBy ? String(item.createdBy) : null,
      updatedAt: item.updatedAt,
      updatedBy: item.updatedBy ? String(item.updatedBy) : null,
      disabledAt: item.disabledAt,
      disabledBy: item.disabledBy ? String(item.disabledBy) : null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, ["super"]);
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as CreateAccountBody | null;

  if (!body?.username || !body?.password || !body?.role) {
    return errorResponse("INVALID_REQUEST", "username, password and role are required.", 400);
  }

  const username = body.username.trim().toLowerCase();
  const password = body.password;
  const role = body.role.trim().toLowerCase();

  if (username.length < 3 || username.length > 32 || password.length < 8) {
    return errorResponse("INVALID_REQUEST", "Invalid username/password format.", 400);
  }

  if (!ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]) || role === "super") {
    return errorResponse("INVALID_ROLE", "Role must be admin or teacher.", 400);
  }

  await connectMongoDB();

  const existing = await AdminModel.findOne({ username }).select("_id").lean();
  if (existing) {
    return errorResponse("USERNAME_TAKEN", "Username already exists.", 409);
  }

  const passwordHash = await hashPassword(password);

  const created = await AdminModel.create({
    username,
    passwordHash,
    role,
    status: "active",
    createdBy: auth.session.adminId,
    updatedBy: auth.session.adminId,
  });

  return successResponse(
    {
      id: String(created._id),
      username: created.username,
      role: created.role,
      status: created.status,
      createdAt: created.createdAt,
    },
    201,
  );
}
