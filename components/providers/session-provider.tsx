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
import { MOCK_SESSION_STORAGE_KEY } from "@/lib/auth";

const SESSION_KEY = ["session"] as const;

interface SessionContextValue {
  session: SessionState;
  /** True while the initial localStorage session is resolving */
  isLoading: boolean;
  user: SessionUser | null;
  /**
   * Role-derived demo check. This is frontend-only and is not a security
   * boundary; real authorization requires server-side authentication.
   */
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<void>;
  /** One-click sign-in using the primary public demo account. */
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
 * The session is a client-only demo record in localStorage. The provider
 * keeps the same component-facing API so a real auth adapter can replace it
 * later without changing the application shell.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useQuery({
    queryKey: SESSION_KEY,
    queryFn: getSession,
    // The session is owned by localStorage + mutations below; no
    // need to refetch more often than the session freshness window.
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== MOCK_SESSION_STORAGE_KEY) return;
      void getSession().then((next) => queryClient.setQueryData(SESSION_KEY, next));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [queryClient]);

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
