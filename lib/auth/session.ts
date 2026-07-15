import type { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api-response";
import { verifyAuthToken } from "@/lib/auth/jwt";
import type { AuthRole, AuthSession } from "@/lib/auth/types";
import { env } from "@/lib/env";
import { connectMongoDB } from "@/lib/mongodb";
import { AdminModel } from "@/models/admin";

interface CookieReader {
  get(name: string): { value: string } | undefined;
}

function normalizeRole(role: unknown): AuthRole | null {
  if (role === "super" || role === "admin" || role === "teacher") {
    return role;
  }

  return null;
}

export function getTokenFromRequest(request: NextRequest) {
  return request.cookies.get(env.AUTH_COOKIE_NAME)?.value ?? null;
}

export function getTokenFromCookieStore(cookieStore: CookieReader) {
  return cookieStore.get(env.AUTH_COOKIE_NAME)?.value ?? null;
}

async function getSessionFromToken(token: string): Promise<AuthSession | null> {
  try {
    const payload = verifyAuthToken(token);
    const role = normalizeRole(payload.role);

    if (!payload.sub || !role) {
      return null;
    }

    await connectMongoDB();

    const admin = await AdminModel.findById(payload.sub)
      .select("username role status")
      .lean();

    if (!admin || admin.status !== "active") {
      return null;
    }

    const dbRole = normalizeRole(admin.role);
    if (!dbRole) {
      return null;
    }

    return {
      adminId: String(admin._id),
      username: admin.username,
      role: dbRole,
    };
  } catch {
    return null;
  }
}

export async function getApiSession(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  return getSessionFromToken(token);
}

export async function getServerSessionFromCookies(cookieStore: CookieReader) {
  const token = getTokenFromCookieStore(cookieStore);
  if (!token) {
    return null;
  }

  return getSessionFromToken(token);
}

export async function requireApiSession(request: NextRequest, allowRoles?: AuthRole[]) {
  const session = await getApiSession(request);

  if (!session) {
    return {
      ok: false as const,
      response: errorResponse("UNAUTHORIZED", "Authentication required.", 401),
    };
  }

  if (allowRoles && !allowRoles.includes(session.role)) {
    return {
      ok: false as const,
      response: errorResponse("FORBIDDEN", "Insufficient permissions.", 403),
    };
  }

  return {
    ok: true as const,
    session,
  };
}
