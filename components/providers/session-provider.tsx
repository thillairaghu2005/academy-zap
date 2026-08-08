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
  authenticateDemoUser,
  clearDemoSession,
  DEMO_SESSION_STORAGE_KEY,
  getDemoSession,
  registerDemo,
} from "@/src/lib/demoAuth";

const SESSION_KEY = ["session"] as const;

interface SessionContextValue {
  session: SessionState;
  /** True while the initial localStorage session is resolving */
  isLoading: boolean;
  user: SessionUser | null;
  /**
   * Role-derived demo check. This is frontend-only and is not a security
    * boundary; it only controls the demo UI.
   */
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

/**
 * The session is a client-only demo record in localStorage. This provider is
 * the single source of truth for the current user and auth state.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useQuery({
    queryKey: SESSION_KEY,
    queryFn: getDemoSession,
    // The session is owned by localStorage + mutations below; no
    // need to refetch more often than the session freshness window.
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DEMO_SESSION_STORAGE_KEY) return;
      queryClient.setQueryData(SESSION_KEY, getDemoSession());
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
      const next = authenticateDemoUser(input);
      applySession(next);
      toast.success(
        `Welcome back, ${next.user?.display_name ?? "Zapster"} ⚡`,
      );
    },
    [applySession],
  );

  const register = React.useCallback(
    async (input: RegisterInput) => {
      const next = registerDemo(input);
      applySession(next);
      toast.success("Account created — welcome to Zapsters ⚡");
    },
    [applySession],
  );

  const logout = React.useCallback(async () => {
    clearDemoSession();
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
