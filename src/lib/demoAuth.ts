"use client";

import type {
  LoginInput,
  RegisterInput,
  SessionState,
  SessionUser,
} from "@/lib/contracts/session";

export const DEMO_CREDENTIALS = {
  email: "demo@zapsters.dev",
  password: "Demo@12345",
} as const;

export const DEMO_USER: SessionUser = {
  id: "demo-user-001",
  display_name: "Raghunandhan",
  email: DEMO_CREDENTIALS.email,
  avatar_url: null,
  role: "student",
  org_id: null,
  isDemo: true,
};

export const DEMO_SESSION_STORAGE_KEY = "zapsters_demo_session";

interface StoredDemoSession {
  id: typeof DEMO_USER.id;
  email: typeof DEMO_USER.email;
  role: typeof DEMO_USER.role;
  isDemo: true;
}

export class DemoAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoAuthError";
  }
}

function anonymousSession(): SessionState {
  return { status: "anonymous", user: null };
}

function isStoredDemoSession(value: unknown): value is StoredDemoSession {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const stored = value as Partial<StoredDemoSession>;
  return (
    stored.id === DEMO_USER.id &&
    stored.email === DEMO_USER.email &&
    stored.role === DEMO_USER.role &&
    stored.isDemo === true
  );
}

function readSession(): SessionState {
  if (typeof window === "undefined") return anonymousSession();

  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    if (!raw || !isStoredDemoSession(JSON.parse(raw))) {
      return anonymousSession();
    }
    return { status: "authenticated", user: DEMO_USER };
  } catch {
    return anonymousSession();
  }
}

// The demo session is intentionally local to this frontend.
export function getDemoSession(): SessionState {
  return readSession();
}

export function authenticateDemoUser(input: LoginInput): SessionState {
  const email = input.email.trim().toLowerCase();
  if (
    email !== DEMO_CREDENTIALS.email ||
    input.password !== DEMO_CREDENTIALS.password
  ) {
    throw new DemoAuthError("Incorrect email or password.");
  }

  const stored: StoredDemoSession = {
    id: DEMO_USER.id,
    email: DEMO_USER.email,
    role: DEMO_USER.role,
    isDemo: true,
  };
  window.localStorage.setItem(
    DEMO_SESSION_STORAGE_KEY,
    JSON.stringify(stored),
  );
  return { status: "authenticated", user: DEMO_USER };
}

export function clearDemoSession(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
  }
}

export function registerDemo(_input: RegisterInput): never {
  throw new DemoAuthError(
    "Account creation is coming soon. Please use the demo account to sign in.",
  );
}

export function authErrorMessage(
  error: unknown,
  fallback = "Please try again later.",
): string {
  return error instanceof DemoAuthError ? error.message : fallback;
}
