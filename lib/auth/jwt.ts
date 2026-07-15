import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

import { env } from "@/lib/env";
import type { AuthRole, AuthTokenPayload } from "@/lib/auth/types";

const JWT_ALGORITHM: SignOptions["algorithm"] = "HS256";

interface SignTokenInput {
  adminId: string;
  username: string;
  role: AuthRole;
}

export function signAuthToken(input: SignTokenInput) {
  const payload: Omit<AuthTokenPayload, "iat" | "exp"> = {
    sub: input.adminId,
    username: input.username,
    role: input.role,
  };

  return jwt.sign(payload, env.JWT_SECRET as Secret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET as Secret) as AuthTokenPayload;
}
