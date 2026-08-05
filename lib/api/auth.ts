import type {
  LoginInput,
  RegisterInput,
  SessionState,
} from "@/lib/contracts/session";
import { MockApiError } from "@/lib/api/errors";

/**
 * Auth API client (product-audit Fix 4: real auth boundary).
 *
 * A thin fetch wrapper over the /api/auth/session route handler — the mock
 * auth rules moved SERVER-side, behind a signed HttpOnly session cookie
 * (see lib/server/session.ts and proxy.ts). Signatures are unchanged
 * from the old all-client mock, so the SessionProvider never changed.
 *
 * Mock rules (now enforced by the route handler, preserved verbatim):
 *  - login rejects passwords shorter than 8 chars and emails ending in
 *    `@error.zapsters.dev` with `invalid_credentials` (the login error
 *    state demo).
 *  - Email ending in `@admin.zapsters.dev` signs in the mock admin
 *    (exercises the role-gated Admin nav).
 *  - `loginDemo()` issues the demo learner session via the route's
 *    `demo` action — the one-click demo affordance.
 *
 * When the real Platform Core auth lands, this module is replaced by the
 * real client SDK — same signatures, zero component changes (build.md §4).
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { cache: "no-store", ...init });
  } catch {
    throw new MockApiError(
      "network_error",
      "Could not reach the auth service.",
      503,
    );
  }
  if (!res.ok) {
    let code = "http_error";
    let message = `Auth request failed (${res.status}).`;
    try {
      const body = (await res.json()) as { code?: string; message?: string };
      if (body.code) code = body.code;
      if (body.message) message = body.message;
    } catch {
      // Non-JSON error body — keep the defaults.
    }
    throw new MockApiError(code, message, res.status);
  }
  return (await res.json()) as T;
}

function post(body: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * Resolve the current session from the HttpOnly cookie. Degrades to
 * anonymous on failure (server unreachable, etc.) so the shell stays usable
 * instead of spinning forever — a real deployment would surface a
 * connectivity banner at this point.
 */
export async function getSession(): Promise<SessionState> {
  try {
    return await request<SessionState>("/api/auth/session");
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
  return request<SessionState>("/api/auth/session", post({
    action: "login",
    email: input.email,
    password: input.password,
  }));
}

export async function register(input: RegisterInput): Promise<SessionState> {
  return request<SessionState>("/api/auth/session", post({
    action: "register",
    display_name: input.display_name,
    email: input.email,
    password: input.password,
  }));
}

export async function logout(): Promise<void> {
  await request<SessionState>("/api/auth/session", post({ action: "logout" }));
}

/** One-click demo learner sign-in (route action `demo`). */
export async function loginDemo(): Promise<SessionState> {
  return request<SessionState>("/api/auth/session", post({ action: "demo" }));
}
