"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthRole } from "@/lib/auth/types";

export interface AuthUser {
  adminId: string;
  username: string;
  role: AuthRole;
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "drawsystem-auth",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
