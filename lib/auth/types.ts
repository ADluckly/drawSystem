export type AuthRole = "super" | "admin" | "teacher";

export interface AuthTokenPayload {
  sub: string;
  username: string;
  role: AuthRole;
  iat?: number;
  exp?: number;
}

export interface AuthSession {
  adminId: string;
  username: string;
  role: AuthRole;
}
