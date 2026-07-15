"use client";

import { useEffect } from "react";

import type { AuthSession } from "@/lib/auth/types";
import { useAuthStore } from "@/store/useAuthStore";

interface SessionSyncProps {
  session: AuthSession;
}

export function SessionSync({ session }: SessionSyncProps) {
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    setUser(session);
  }, [session, setUser]);

  return null;
}
