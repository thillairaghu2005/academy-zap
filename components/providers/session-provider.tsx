"use client";

import * as React from "react";
import { toast } from "sonner";

import type {
  LoginInput,
  RegisterInput,
  SessionState,
  SessionUser,
} from "@/lib/contracts/session";
import {
  DEMO_STORAGE_KEYS,
  readDemoStorage,
  removeDemoStorage,
  subscribeDemoStorage,
  writeDemoStorage,
} from "@/lib/demo/storage";

interface MockAccount {
  user: SessionUser;
  password: string;
}

interface SessionContextValue {
  session: SessionState;
  /** True while the initial server session is resolving. */
  isLoading: boolean;
  user: SessionUser | null;
  /** UI hint only for the frontend demo. */
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

const DEFAULT_ACCOUNT: MockAccount = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    display_name: "Demo Zapster",
    email: "demo@zapsters.dev",
    avatar_url: null,
    role: "user",
    org_id: null,
  },
  password: "zapsters-demo",
};

function accounts(): MockAccount[] {
  return readDemoStorage(DEMO_STORAGE_KEYS.authAccounts, [DEFAULT_ACCOUNT]);
}

function createUser(input: RegisterInput): SessionUser {
  return {
    id: crypto.randomUUID(),
    display_name: input.display_name.trim(),
    email: input.email.trim().toLowerCase(),
    avatar_url: null,
    role: "user",
    org_id: null,
  };
}

function persistSession(user: SessionUser): void {
  writeDemoStorage(DEMO_STORAGE_KEYS.authSession, user);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<SessionState>({ status: "loading", user: null });

  React.useEffect(() => {
    const restore = () => {
      const user = readDemoStorage<SessionUser | null>(DEMO_STORAGE_KEYS.authSession, null);
      setSession(user ? { status: "authenticated", user } : { status: "anonymous", user: null });
    };
    restore();
    return subscribeDemoStorage(restore);
  }, []);

  const login = React.useCallback(
    async (input: LoginInput) => {
      const account = accounts().find(
        (candidate) => candidate.user.email === input.email.trim().toLowerCase(),
      );
      if (!account || account.password !== input.password) {
        throw new Error("Email or password is incorrect.");
      }
      persistSession(account.user);
      setSession({ status: "authenticated", user: account.user });
      toast.success(
        `Welcome back, ${account.user.display_name} ⚡`,
      );
    },
    [],
  );

  const register = React.useCallback(
    async (input: RegisterInput) => {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (accounts().some((candidate) => candidate.user.email === normalizedEmail)) {
        throw new Error("An account with that email already exists.");
      }
      const user = createUser({ ...input, email: normalizedEmail });
      writeDemoStorage(DEMO_STORAGE_KEYS.authAccounts, [...accounts(), { user, password: input.password }]);
      persistSession(user);
      setSession({ status: "authenticated", user });
      toast.success("Account created — welcome to Zapsters ⚡");
    },
    [],
  );

  const logout = React.useCallback(async () => {
    removeDemoStorage(DEMO_STORAGE_KEYS.authSession);
    setSession({ status: "anonymous", user: null });
    toast.info("Signed out.");
  }, []);

  const value = React.useMemo<SessionContextValue>(
    () => ({
      session: session ?? { status: "loading", user: null },
      isLoading: session.status === "loading",
      user: session?.user ?? null,
      isAdmin:
        session?.user?.role === "org_admin" ||
        session?.user?.role === "platform_ops" ||
        session?.user?.role === "admin",
      login,
      register,
      logout,
    }),
    [session, login, register, logout],
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
