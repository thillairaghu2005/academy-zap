"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  LoginInput,
  RegisterInput,
  SessionState,
  SessionUser,
} from "@/lib/contracts/session";
import {
  getSession,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "@/lib/api/auth";

const SESSION_KEY = ["session"] as const;

interface SessionContextValue {
  session: SessionState;
  /** True while the initial getSession() mock call is resolving */
  isLoading: boolean;
  user: SessionUser | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

/**
 * Mock session provider (build.md F0). Backed by the mock auth API through
 * TanStack Query so the swap to real Platform Core auth (build.md §4) is a
 * queryFn replacement, not a component rewrite.
 *
 * Mock behavior (deterministic, demoable):
 *  - getSession() auto-authenticates the demo learner on first load.
 *  - logout() flips to anonymous for the current page load; a refresh
 *    re-enters the demo session.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useQuery({
    queryKey: SESSION_KEY,
    queryFn: getSession,
  });

  const applySession = React.useCallback(
    (next: SessionState) => {
      queryClient.setQueryData(SESSION_KEY, next);
    },
    [queryClient],
  );

  const login = React.useCallback(
    async (input: LoginInput) => {
      const next = await apiLogin(input);
      applySession(next);
      toast.success(
        `Welcome back, ${next.user?.display_name ?? "Zapster"} ⚡`,
      );
    },
    [applySession],
  );

  const register = React.useCallback(
    async (input: RegisterInput) => {
      const next = await apiRegister(input);
      applySession(next);
      toast.success("Account created — welcome to Zapsters ⚡");
    },
    [applySession],
  );

  const logout = React.useCallback(async () => {
    await apiLogout();
    applySession({ status: "anonymous", user: null });
    toast.info("Signed out. The demo session returns on refresh.");
  }, [applySession]);

  const value = React.useMemo<SessionContextValue>(
    () => ({
      session: session ?? { status: "loading", user: null },
      isLoading,
      user: session?.user ?? null,
      login,
      register,
      logout,
    }),
    [session, isLoading, login, register, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within <SessionProvider>");
  }
  return ctx;
}
