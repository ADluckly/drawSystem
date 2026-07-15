import type { NextResponse } from "next/server";

import { env } from "@/lib/env";

function getCookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
  };
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(env.AUTH_COOKIE_NAME, token, {
    ...getCookieBaseOptions(),
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(env.AUTH_COOKIE_NAME, "", {
    ...getCookieBaseOptions(),
    maxAge: 0,
  });
}
