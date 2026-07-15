import { jwtVerify } from "jose/jwt/verify";
import { NextResponse, type NextRequest } from "next/server";

import { canAccessPath } from "@/lib/auth/rbac";
import type { AuthRole } from "@/lib/auth/types";
import { env } from "@/lib/env";

const LOGIN_PATH = "/login";

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

async function verifyFromMiddlewareToken(token: string) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });

  return payload;
}

function normalizeRole(role: unknown): AuthRole | null {
  if (role === "super" || role === "admin" || role === "teacher") {
    return role;
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(env.AUTH_COOKIE_NAME)?.value;

  if (pathname === LOGIN_PATH) {
    if (!token) {
      return NextResponse.next();
    }

    try {
      await verifyFromMiddlewareToken(token);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch {
      return NextResponse.next();
    }
  }

  if (!token) {
    return redirectToLogin(request);
  }

  try {
    const payload = await verifyFromMiddlewareToken(token);
    const role = normalizeRole(payload.role);

    if (!role || !canAccessPath(pathname, role)) {
      return NextResponse.redirect(new URL("/403", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = redirectToLogin(request);
    response.cookies.set(env.AUTH_COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
    });
    return response;
  }
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/students/:path*",
    "/recharges/:path*",
    "/signs/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
