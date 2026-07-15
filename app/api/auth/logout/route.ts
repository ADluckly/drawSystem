import { successResponse } from "@/lib/api-response";
import { clearAuthCookie } from "@/lib/auth/cookies";

export async function POST() {
  const response = successResponse({ message: "Logged out." });
  clearAuthCookie(response);
  return response;
}
