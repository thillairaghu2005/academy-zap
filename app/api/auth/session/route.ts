import { NextRequest, NextResponse } from "next/server";

import type { SessionState, SessionUser } from "@/lib/contracts/session";
import { MOCK_LEARNER } from "@/lib/mocks/users";
import { DEMO_MODE } from "@/lib/config";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SIGNED_OUT_COOKIE,
  verifySessionToken,
} from "@/lib/server/session";
import {
  createAccount,
  findAccountByEmail,
  findUserByEmail,
  findUserByUid,
  verifyPassword,
} from "@/lib/server/accounts";
import { delay, jitter } from "@/lib/api/helpers";

/**
 * Session endpoint (product-audit Fix 4).
 *
 * The mock auth rules moved HERE — server-side, behind a real HttpOnly
 * cookie — replacing the old all-client mock in lib/api/auth.ts. The client
 * auth module is now a thin fetch wrapper with identical signatures, so the
 * SessionProvider never changed. When Platform Core auth lands, this route
 * handler is replaced wholesale.
 *
 * Credentials are REAL: login looks the email up in the seeded account
 * store (lib/server/accounts.ts) and validates the password against its
 * scrypt hash — no email is ever "auto-accepted". The demo account
 * (demo@company.com / Demo@123) is seeded idempotently on first startup.
 *
 * GET  → resolve session from cookie (or, in DEMO_MODE only, auto-issue the
 *        demo learner session — gated on the signed-out marker so logout
 *        actually sticks).
 * POST → action: "login" | "register" | "demo" | "logout".
 */

function sessionResponse(user: SessionUser | null): NextResponse {
  const state: SessionState = user
    ? { status: "authenticated", user }
    : { status: "anonymous", user: null };
  return NextResponse.json(state);
}

function apiError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ code, message }, { status });
}

function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    // NOTE: real deployments must serve HTTPS — a Secure cookie issued over
    // plain http is silently dropped by browsers on non-localhost hosts.
    secure: process.env.NODE_ENV === "production",
  });
}

function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/**
 * Coerce an untrusted JSON field to a string. A malformed client could post
 * non-string values (e.g. a numeric password); without this, .trim() or
 * scryptSync would throw and turn a bad request into an internal 500.
 */
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  await delay(jitter(240));

  const payload = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (payload) {
    // Prefer the email carried in the token (a shared uid can belong to
    // several emails — demo@company.com vs aarav@zapsters.dev); fall back
    // to uid for legacy tokens issued without an email (demo auto-auth).
    const user =
      (payload.email ? findUserByEmail(payload.email) : null) ??
      findUserByUid(payload.uid);
    if (user) return sessionResponse(user);
  }

  // Demo auto-auth — only in demo mode, and never right after a logout.
  if (DEMO_MODE && !request.cookies.get(SIGNED_OUT_COOKIE)) {
    const res = sessionResponse(MOCK_LEARNER);
    setSessionCookie(res, await createSessionToken(MOCK_LEARNER));
    return res;
  }

  return sessionResponse(null);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  await delay(jitter(260));

  let body: {
    action?: string;
    email?: string;
    password?: string;
    display_name?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const action = body.action ?? "login";

  // Logout — clear the session AND set the signed-out marker so the demo
  // auto-auth does not immediately re-issue a session on the next load.
  if (action === "logout") {
    const res = sessionResponse(null);
    clearSessionCookie(res);
    res.cookies.set(SIGNED_OUT_COOKIE, "1", {
      httpOnly: true,
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  }

  let user: SessionUser | null = null;

  if (action === "demo") {
    // Legacy one-click demo affordance — a DEMO_MODE surface; gate the
    // endpoint to match the UI so it cannot skip sign-in in a
    // production-shaped build. The client's loginDemo() now uses the real
    // demo credentials instead (lib/api/auth.ts).
    if (!DEMO_MODE) {
      return apiError("demo_unavailable", "Demo sign-in is disabled.", 403);
    }
    user = MOCK_LEARNER;
  } else if (action === "login") {
    // Real credential validation — email lookup + scrypt password check.
    // Coerce to strings so a malformed body (numeric email/password) fails
    // the credential check instead of 500ing the route.
    const email = asString(body.email).trim().toLowerCase();
    const password = asString(body.password);
    const account = findAccountByEmail(email);
    if (!account || !verifyPassword(password, account)) {
      // One message for "no such account" and "wrong password" — never
      // reveal which, and never expose internal details.
      return apiError(
        "invalid_credentials",
        "Incorrect email or password.",
        401,
      );
    }
    user = account.user;
  } else if (action === "register") {
    const password = asString(body.password);
    const email = asString(body.email).trim().toLowerCase();
    if (password.length < 8) {
      return apiError(
        "weak_password",
        "Password must be at least 8 characters.",
        422,
      );
    }
    // Demo surface: taken@zapsters.dev demonstrates the duplicate error.
    if (email === "taken@zapsters.dev") {
      return apiError(
        "email_taken",
        "An account with this email already exists.",
        409,
      );
    }
    const result = createAccount({
      display_name: asString(body.display_name) || "New Learner",
      email,
      password,
    });
    if (result.status === "exists") {
      return apiError(
        "email_taken",
        "An account with this email already exists.",
        409,
      );
    }
    user = result.user;
  } else {
    return apiError("invalid_action", "Unknown session action.", 400);
  }

  const res = sessionResponse(user);
  setSessionCookie(res, await createSessionToken(user));
  // A successful sign-in clears the signed-out marker.
  res.cookies.set(SIGNED_OUT_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
