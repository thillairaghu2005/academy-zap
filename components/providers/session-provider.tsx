"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  clearAccessToken,
  getCurrentUser,
  login as backendLogin,
  logout as backendLogout,
  register as backendRegister,
} from "@/lib/api/client";
import type { ApiUser } from "@/lib/api/contracts";
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
import { AUTH_MODE } from "@/lib/config";
import { MOCK_LEARNER } from "@/lib/mocks/users";

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
  user: MOCK_LEARNER,
  password: "demo123",
};

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
    if (AUTH_MODE === "backend") {
      let cancelled = false;
      void getCurrentUser()
        .then((user) => {
          if (!cancelled) setSession({ status: "authenticated", user: toSessionUser(user) });
        })
        .catch(() => {
          if (!cancelled) setSession({ status: "anonymous", user: null });
        });
      return () => {
        cancelled = true;
      };
    }

    const restore = () => {
      const user = readDemoStorage<SessionUser | null>(DEMO_STORAGE_KEYS.authSession, null);
      setSession(user ? { status: "authenticated", user } : { status: "anonymous", user: null });
    };
    restore();
    return subscribeDemoStorage(restore);
  }, []);

  const login = React.useCallback(
    async (input: LoginInput) => {
      if (AUTH_MODE === "backend") {
        const result = await backendLogin(input);
        const user = toSessionUser(result.user);
        setSession({ status: "authenticated", user });
        toast.success(`Welcome back, ${user.display_name} ⚡`);
        return;
      }

      const account = accounts().find(
        (candidate) => candidate.user.email === input.email.trim().toLowerCase(),
      );
      if (!account || account.password !== input.password) {
        throw new Error("Invalid email or password.");
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
      if (AUTH_MODE === "backend") {
        const result = await backendRegister(input);
        const user = toSessionUser(result.user);
        setSession({ status: "authenticated", user });
        toast.success("Account created — welcome to Zapsters ⚡");
        return;
      }

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
    if (AUTH_MODE === "backend") {
      try {
        await backendLogout();
      } finally {
        clearAccessToken();
        setSession({ status: "anonymous", user: null });
        toast.info("Signed out.");
      }
      return;
    }

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
