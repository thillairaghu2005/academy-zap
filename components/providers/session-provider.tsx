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
  loginDemo as apiLoginDemo,
  logout as apiLogout,
  register as apiRegister,
} from "@/lib/api/auth";

const SESSION_KEY = ["session"] as const;

interface SessionContextValue {
  session: SessionState;
  /** True while the initial getSession() mock call is resolving */
  isLoading: boolean;
  user: SessionUser | null;
  /**
   * Mock admin check (F7 Task 1) — role-derived, and therefore FRONTEND-ONLY
   * and bypassable. The real authorization lives in the role-gated backend
   * admin APIs (build.md §4.2); this mirrors the UX so /admin is demoable.
   */
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<void>;
  /** One-click demo learner sign-in (DEMO_MODE affordance only). */
  loginDemo: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

/**
 * Session provider (build.md F0). Backed by the auth client through
 * TanStack Query so the swap to real Platform Core auth (build.md §4) is a
 * queryFn replacement, not a component rewrite.
 *
 * The session itself is a signed HttpOnly cookie (Fix 4): the server
 * resolves it on GET /api/auth/session, and login/register/logout/demo
 * mutate it via POST. In DEMO_MODE the server auto-issues the demo learner
 * session; outside demo mode, anonymous visitors are redirected to /login
 * by middleware.ts before they ever reach the shell.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useQuery({
    queryKey: SESSION_KEY,
    queryFn: getSession,
    // The session is owned by the HttpOnly cookie + mutations below; no
    // need to refetch on every window focus.
    staleTime: 60_000,
    retry: false,
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

  const loginDemo = React.useCallback(async () => {
    const next = await apiLoginDemo();
    applySession(next);
    toast.success(
      `Welcome back, ${next.user?.display_name ?? "Zapster"} ⚡`,
    );
  }, [applySession]);

  const logout = React.useCallback(async () => {
    await apiLogout();
    applySession({ status: "anonymous", user: null });
    // The signed-out marker cookie makes logout stick across refreshes —
    // even in DEMO_MODE, where the server would otherwise re-issue.
    toast.info("Signed out.");
  }, [applySession]);

  const value = React.useMemo<SessionContextValue>(
    () => ({
      session: session ?? { status: "loading", user: null },
      isLoading,
      user: session?.user ?? null,
      isAdmin: session?.user?.role === "admin",
      login,
      loginDemo,
      register,
      logout,
    }),
    [session, isLoading, login, loginDemo, register, logout],
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
