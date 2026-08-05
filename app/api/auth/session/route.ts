import { NextRequest, NextResponse } from "next/server";

import type { SessionState, SessionUser } from "@/lib/contracts/session";
import { MOCK_ADMIN, MOCK_LEARNER, MOCK_REVIEWERS } from "@/lib/mocks/users";
import { DEMO_MODE } from "@/lib/config";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SIGNED_OUT_COOKIE,
  verifySessionToken,
} from "@/lib/server/session";
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
 * GET  → resolve session from cookie (or, in DEMO_MODE only, auto-issue the
 *        demo learner session — gated on the signed-out marker so logout
 *        actually sticks).
 * POST → action: "login" | "register" | "demo" | "logout".
 *
 * The mock login/register rules are preserved verbatim (deterministic,
 * demoable): short passwords and @error.zapsters.dev are rejected,
 * @admin.zapsters.dev resolves the mock admin, "demo" issues the learner.
 */

const USER_DIRECTORY = new Map<string, SessionUser>();
for (const user of [MOCK_LEARNER, MOCK_ADMIN, ...MOCK_REVIEWERS]) {
  USER_DIRECTORY.set(user.id, user);
}

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  await delay(jitter(240));

  const payload = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (payload) {
    const user = USER_DIRECTORY.get(payload.uid);
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
    // The one-click demo affordance is a DEMO_MODE surface — gate the
    // endpoint to match the UI so it cannot be used to skip sign-in in a
    // production-shaped build.
    if (!DEMO_MODE) {
      return apiError("demo_unavailable", "Demo sign-in is disabled.", 403);
    }
    user = MOCK_LEARNER;
  } else if (action === "login") {
    // Mock rules preserved verbatim from the old client-side mock.
    if (!body.password || body.password.length < 8) {
      return apiError("invalid_credentials", "Invalid email or password.", 401);
    }
    // The error-demo email is `error@zapsters.dev` (exact), plus any
    // `*@error.zapsters.dev` variant — both demo the 401 path.
    const email = (body.email ?? "").toLowerCase();
    if (email === "error@zapsters.dev" || email.endsWith("@error.zapsters.dev")) {
      return apiError("invalid_credentials", "Invalid email or password.", 401);
    }
    user = email.endsWith("@admin.zapsters.dev") ? MOCK_ADMIN : MOCK_LEARNER;
  } else if (action === "register") {
    if (!body.password || body.password.length < 8) {
      return apiError(
        "weak_password",
        "Password must be at least 8 characters.",
        422,
      );
    }
    if (body.email === "taken@zapsters.dev") {
      return apiError(
        "email_taken",
        "An account with this email already exists.",
        409,
      );
    }
    user = MOCK_LEARNER;
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
