import type {
  LoginInput,
  RegisterInput,
  SessionState,
  SessionUser,
} from "@/lib/contracts/session";
import { MockApiError } from "@/lib/api/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.display_name === "string" &&
    typeof value.email === "string" &&
    (value.avatar_url === null || typeof value.avatar_url === "string") &&
    (value.role === "learner" || value.role === "admin") &&
    (value.org_id === null || typeof value.org_id === "string")
  );
}

function isSessionState(value: unknown): value is SessionState {
  if (!isRecord(value)) return false;
  return (
    (value.status === "anonymous" && value.user === null) ||
    (value.status === "authenticated" && isSessionUser(value.user))
  );
}

async function request<T>(
  path: string,
  validate: (value: unknown) => value is T,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
    });
  } catch {
    throw new MockApiError(
      "network_error",
      "Could not reach the auth service.",
      503,
    );
  }
  if (!res.ok) {
    let code = "http_error";
    let message = "The auth service is unavailable. Please try again later.";
    try {
      const body: unknown = await res.json();
      if (isRecord(body)) {
        if (typeof body.code === "string" && body.code) code = body.code;
        if (typeof body.message === "string" && body.message) {
          message = body.message;
        }
      }
    } catch {
      // Keep a generic message for non-JSON responses.
    }
    throw new MockApiError(code, message, res.status);
  }
  const body: unknown = await res.json();
  if (!validate(body)) {
    throw new MockApiError(
      "invalid_response",
      "The auth service returned an invalid response.",
      502,
    );
  }
  return body;
}

export function authErrorMessage(
  err: unknown,
  fallback = "Please try again later.",
): string {
  if (err instanceof MockApiError) {
    if (err.status >= 500) {
      return "Server unavailable. Please try again later.";
    }
    return err.message || fallback;
  }
  return fallback;
}

function post(body: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export async function getSession(): Promise<SessionState> {
  try {
    return await request("/api/auth/session", isSessionState);
  } catch (err) {
    if (err instanceof MockApiError) {
      console.warn(
        "[auth] session check failed, treating as anonymous:",
        err.message,
      );
    }
    return { status: "anonymous", user: null };
  }
}

export async function login(input: LoginInput): Promise<SessionState> {
  return request(
    "/api/auth/session",
    isSessionState,
    post({
      action: "login",
      email: input.email,
      password: input.password,
    }),
  );
}

export async function register(input: RegisterInput): Promise<SessionState> {
  return request(
    "/api/auth/session",
    isSessionState,
    post({
      action: "register",
      display_name: input.display_name,
      email: input.email,
      password: input.password,
    }),
  );
}

export async function logout(): Promise<void> {
  await request(
    "/api/auth/session",
    isSessionState,
    post({ action: "logout" }),
  );
}

/** One-click development demo sign-in; no credential is sent to the client. */
export async function loginDemo(): Promise<SessionState> {
  return request(
    "/api/auth/session",
    isSessionState,
    post({ action: "demo" }),
  );
}
