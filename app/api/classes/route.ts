import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { ClassModel } from "@/models/class";

interface ClassCreateBody {
  name?: string;
  code?: string;
  note?: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  await connectMongoDB();

  const items = await ClassModel.find({ status: "active" }).sort({ name: 1 }).lean();

  return successResponse({
    items: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      code: item.code,
      status: item.status,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as ClassCreateBody | null;
  if (!body?.name || !body?.code) {
    return errorResponse("INVALID_REQUEST", "name and code are required.", 400);
  }

  await connectMongoDB();

  const created = await ClassModel.create({
    name: body.name.trim(),
    code: body.code.trim().toUpperCase(),
    note: body.note?.trim() ?? "",
    status: "active",
  });

  return successResponse(
    {
      id: String(created._id),
      name: created.name,
      code: created.code,
      status: created.status,
    },
    201,
  );
}
