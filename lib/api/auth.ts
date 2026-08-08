import type {
  LoginInput,
  RegisterInput,
  SessionState,
} from "@/lib/contracts/session";
import { MockApiError } from "@/lib/api/errors";
import {
  authenticateMockUser,
  clearMockSession,
  getMockSession,
  unavailableRegistration,
} from "@/lib/auth";

export function authErrorMessage(
  err: unknown,
  fallback = "Please try again later.",
): string {
  if (err instanceof MockApiError) {
    if (err.status >= 500) return err.message || fallback;
    return err.message || fallback;
  }
  return fallback;
}

export async function getSession(): Promise<SessionState> {
  return getMockSession();
}

export async function login(input: LoginInput): Promise<SessionState> {
  return authenticateMockUser(input);
}

export async function register(input: RegisterInput): Promise<SessionState> {
  unavailableRegistration(input);
}

export async function logout(): Promise<void> {
  clearMockSession();
}

/** Development shortcut using the primary public demo account. */
export async function loginDemo(): Promise<SessionState> {
  return authenticateMockUser({
    email: "demo@zapsters.dev",
    password: "Demo@12345",
  });
}
