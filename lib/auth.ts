"use client";

import type {
  LoginInput,
  RegisterInput,
  SessionState,
  SessionUser,
} from "@/lib/contracts/session";
import { MockApiError } from "@/lib/api/errors";

export const MOCK_SESSION_STORAGE_KEY = "zapsters_mock_session";

interface MockAccount {
  email: string;
  password: string;
  user: SessionUser;
}

interface StoredMockSession {
  authenticated: true;
  email: string;
  role: "user" | "admin";
}

// Frontend demonstration credentials only. Replace this module with real
// server-side authentication before using the application in production.
const MOCK_ACCOUNTS: readonly MockAccount[] = [
  {
    email: "demo@zapsters.dev",
    password: "Demo@12345",
    user: {
      id: "demo-user",
      display_name: "Demo User",
      email: "demo@zapsters.dev",
      avatar_url: null,
      role: "user",
      org_id: null,
    },
  },
  {
    email: "admin@zapsters.dev",
    password: "Admin@12345",
    user: {
      id: "demo-admin",
      display_name: "Admin User",
      email: "admin@zapsters.dev",
      avatar_url: null,
      role: "admin",
      org_id: null,
    },
  },
];

function anonymous(): SessionState {
  return { status: "anonymous", user: null };
}

function accountForStoredSession(value: unknown): MockAccount | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const stored = value as Partial<StoredMockSession>;
  if (
    stored.authenticated !== true ||
    typeof stored.email !== "string" ||
    (stored.role !== "user" && stored.role !== "admin")
  ) {
    return null;
  }

  const account = MOCK_ACCOUNTS.find(
    (candidate) =>
      candidate.email === stored.email &&
      candidate.user.role === stored.role,
  );
  return account ?? null;
}

function readStoredSession(): SessionState {
  if (typeof window === "undefined") return anonymous();

  try {
    const raw = window.localStorage.getItem(MOCK_SESSION_STORAGE_KEY);
    if (!raw) return anonymous();

    const account = accountForStoredSession(JSON.parse(raw));
    return account
      ? { status: "authenticated", user: account.user }
      : anonymous();
  } catch {
    return anonymous();
  }
}

function saveSession(account: MockAccount): SessionState {
  const stored: StoredMockSession = {
    authenticated: true,
    email: account.email,
    role: account.user.role === "admin" ? "admin" : "user",
  };
  window.localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(stored));
  return { status: "authenticated", user: account.user };
}

export function getMockSession(): SessionState {
  return readStoredSession();
}

export function authenticateMockUser(input: LoginInput): SessionState {
  const email = input.email.trim().toLowerCase();
  const account = MOCK_ACCOUNTS.find(
    (candidate) => candidate.email === email && candidate.password === input.password,
  );

  if (!account) {
    throw new MockApiError(
      "invalid_credentials",
      "Incorrect email or password.",
      401,
    );
  }

  return saveSession(account);
}

export function clearMockSession(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
  }
}

export function unavailableRegistration(_input: RegisterInput): never {
  throw new MockApiError(
    "registration_unavailable",
    "Account creation is coming soon. Please use a demo account to sign in.",
    503,
  );
}
