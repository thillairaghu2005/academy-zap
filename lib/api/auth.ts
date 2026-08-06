import type {
  LoginInput,
  RegisterInput,
  SessionState,
} from "@/lib/contracts/session";
import { MockApiError } from "@/lib/api/errors";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-credentials";

/**
 * Auth API client (product-audit Fix 4: real auth boundary).
 *
 * A thin fetch wrapper over the /api/auth/session route handler — the mock
 * auth rules moved SERVER-side, behind a signed HttpOnly session cookie
 * (see lib/server/session.ts and proxy.ts). Signatures are unchanged
 * from the old all-client mock, so the SessionProvider never changed.
 *
 * Auth rules live in the route handler (app/api/auth/session/route.ts):
 *  - login validates email + password against the seeded account store
 *    (scrypt hashes — see lib/server/accounts.ts). Unknown emails and
 *    wrong passwords both return `invalid_credentials` (401).
 *  - `loginDemo()` signs in the seeded demo account through the SAME real
 *    credential path (demo@company.com / Demo@123) — no shortcuts.
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
    let message = "The auth service is unavailable. Please try again later.";
    try {
      const body = (await res.json()) as { code?: string; message?: string };
      if (body.code) code = body.code;
      if (body.message) message = body.message;
    } catch {
      // Non-JSON error body (e.g. a 500 HTML page) — keep the generic
      // message; never surface the raw status or server internals.
    }
    throw new MockApiError(code, message, res.status);
  }
  return (await res.json()) as T;
}

/**
 * Map an auth failure to a user-facing message. Internal details (status
 * codes, stack traces, server messages) never reach the UI.
 */
export function authErrorMessage(
  err: unknown,
  fallback = "Please try again later.",
): string {
  if (err instanceof MockApiError) {
    // Server is unreachable or crashed — never show the internal status.
    if (err.status >= 500) {
      return "Server unavailable. Please try again later.";
    }
    // Server-provided 4xx messages are already user-facing and vetted.
    return err.message || fallback;
  }
  return fallback;
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

/**
 * One-click demo sign-in — the seeded demo account through the REAL
 * credential path (no special action, no bypass).
 */
export async function loginDemo(): Promise<SessionState> {
  return request<SessionState>("/api/auth/session", post({
    action: "login",
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  }));
}
