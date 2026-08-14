"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  clearAccessToken,
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "@/lib/api/client";
import type { ApiUser } from "@/lib/api/contracts";
import type {
  LoginInput,
  RegisterInput,
  SessionState,
  SessionUser,
} from "@/lib/contracts/session";

const SESSION_KEY = ["session"] as const;

interface SessionContextValue {
  session: SessionState;
  /** True while the initial server session is resolving. */
  isLoading: boolean;
  user: SessionUser | null;
  /** UI hint only. Backend authorization remains authoritative. */
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

function toSessionUser(user: ApiUser): SessionUser {
  return {
    id: user.id,
    display_name: user.display_name,
    email: user.email,
    avatar_url: null,
    role: user.role,
    org_id: user.org_id,
  };
}

async function loadSession(): Promise<SessionState> {
  try {
    const user = await getCurrentUser();
    return { status: "authenticated", user: toSessionUser(user) };
  } catch {
    return { status: "anonymous", user: null };
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useQuery({
    queryKey: SESSION_KEY,
    queryFn: loadSession,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
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
      const result = await apiLogin(input);
      const next = { status: "authenticated" as const, user: toSessionUser(result.user) };
      applySession(next);
      toast.success(
        `Welcome back, ${next.user?.display_name ?? "Zapster"} ⚡`,
      );
    },
    [applySession],
  );

  const register = React.useCallback(
    async (input: RegisterInput) => {
      const result = await apiRegister(input);
      const next = { status: "authenticated" as const, user: toSessionUser(result.user) };
      applySession(next);
      toast.success("Account created — welcome to Zapsters ⚡");
    },
    [applySession],
  );

  const logout = React.useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      clearAccessToken();
      applySession({ status: "anonymous", user: null });
      toast.info("Signed out.");
    }
  }, [applySession]);

  const value = React.useMemo<SessionContextValue>(
    () => ({
      session: session ?? { status: "loading", user: null },
      isLoading,
      user: session?.user ?? null,
      isAdmin:
        session?.user?.role === "org_admin" ||
        session?.user?.role === "platform_ops" ||
        session?.user?.role === "admin",
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
