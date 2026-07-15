import { NextRequest } from "next/server";

import { successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  return successResponse({ user: auth.session });
}
