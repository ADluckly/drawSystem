import { NextRequest } from "next/server";

import { successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { AdminModel } from "@/models/admin";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  await connectMongoDB();

  const teachers = await AdminModel.find({ role: "teacher", status: "active" })
    .select("username")
    .sort({ username: 1 })
    .lean();

  return successResponse({
    items: teachers.map((item) => ({
      id: String(item._id),
      username: item.username,
    })),
  });
}