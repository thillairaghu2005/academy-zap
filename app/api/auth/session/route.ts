import { NextRequest, NextResponse } from "next/server";

import type { SessionState, SessionUser } from "@/lib/contracts/session";
import { DEMO_MODE } from "@/lib/config";
import {
  createSessionToken,
  isProductionLikeRuntime,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SIGNED_OUT_COOKIE,
  revokeSessionToken,
  verifySessionToken,
} from "@/lib/server/session";
import {
  createAccount,
  DEMO_EMAIL,
  findAccountByEmail,
  findUserByEmail,
  findUserByUid,
  verifyPassword,
} from "@/lib/server/accounts";
import { delay, jitter } from "@/lib/api/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUTH_BODY_BYTES = 16 * 1024;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const MAX_DISPLAY_NAME_LENGTH = 48;
const MAX_ACTION_LENGTH = 32;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_IP_LIMIT = 12;
const LOGIN_IDENTITY_LIMIT = 8;
const REGISTER_IP_LIMIT = 5;
const DEMO_IP_LIMIT = 20;
const ALLOWED_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);

interface AuthBody {
  action?: string;
  email?: string;
  password?: string;
  display_name?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

function sessionResponse(user: SessionUser | null): NextResponse {
  const state: SessionState = user
    ? { status: "authenticated", user }
    : { status: "anonymous", user: null };
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}

function apiError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    { code, message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function authInfrastructureError(action: string, error: unknown): NextResponse {
  console.error("[auth] infrastructure failure", {
    action,
    error: error instanceof Error ? error.name : "unknown",
  });
  return apiError(
    "auth_unavailable",
    "Something went wrong, please try again.",
    500,
  );
}

function rateLimitError(retryAfter: number): NextResponse {
  const response = apiError(
    "rate_limited",
    "Too many attempts. Please try again later.",
    429,
  );
  response.headers.set("Retry-After", String(retryAfter));
  return response;
}

function secureCookies(): boolean {
  return isProductionLikeRuntime();
}

function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: secureCookies(),
    priority: "high",
  });
}

function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: secureCookies(),
    priority: "high",
  });
}

function setSignedOutCookie(res: NextResponse): void {
  res.cookies.set(SIGNED_OUT_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: secureCookies(),
  });
}

function clearSignedOutCookie(res: NextResponse): void {
  res.cookies.set(SIGNED_OUT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: secureCookies(),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined | null {
  if (!(key in record)) return undefined;
  return readString(record[key]) ?? null;
}

function parseAuthBody(value: unknown): AuthBody | null {
  if (!isRecord(value)) return null;
  const action = readOptionalString(value, "action");
  const email = readOptionalString(value, "email");
  const password = readOptionalString(value, "password");
  const displayName = readOptionalString(value, "display_name");
  if (
    action === null ||
    email === null ||
    password === null ||
    displayName === null
  ) {
    return null;
  }
  return {
    action,
    email,
    password,
    display_name: displayName,
  };
}

function normalizeEmail(value: string | undefined): string | null {
  if (!value || value.length > MAX_EMAIL_LENGTH) return null;
  const email = value.trim().toLowerCase();
  return email.length > 0 && EMAIL_PATTERN.test(email) ? email : null;
}

function validPassword(value: string | undefined): string | null {
  if (value === undefined || value.length > MAX_PASSWORD_LENGTH) return null;
  return value;
}

function normalizeDisplayName(value: string | undefined): string | null {
  if (value === undefined) return null;
  const displayName = value.trim();
  if (
    displayName.length < 2 ||
    displayName.length > MAX_DISPLAY_NAME_LENGTH
  ) {
    return null;
  }
  return displayName;
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === request.nextUrl.origin;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === request.nextUrl.origin;
    } catch {
      return false;
    }
  }

  return request.method === "GET";
}

function requestSecurityError(request: NextRequest): NextResponse | null {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && !ALLOWED_FETCH_SITES.has(fetchSite)) {
    return apiError(
      "cross_site_request",
      "This request must originate from Zapsters.",
      403,
    );
  }

  const originHeaderPresent = request.headers.has("origin");
  if ((request.method !== "GET" || originHeaderPresent) && !sameOrigin(request)) {
    return apiError(
      "origin_mismatch",
      "This request must originate from Zapsters.",
      403,
    );
  }

  return null;
}

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const forwardedAddress = forwarded?.split(",")[0]?.trim();
  if (forwardedAddress && forwardedAddress.length <= 128) {
    return forwardedAddress;
  }
  const realAddress = request.headers.get("x-real-ip")?.trim();
  return realAddress && realAddress.length <= 128 ? realAddress : "unknown";
}

function pruneRateLimits(now: number): void {
  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) rateLimits.delete(key);
  }
}

function consumeRateLimit(
  key: string,
  limit: number,
): number | null {
  const now = Date.now();
  pruneRateLimits(now);
  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }
  if (current.count >= limit) {
    return Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  }
  current.count += 1;
  return null;
}

function rateLimitFor(
  request: NextRequest,
  action: string,
  email: string | null,
): NextResponse | null {
  const address = clientKey(request);
  const ipLimit =
    action === "register"
      ? REGISTER_IP_LIMIT
      : action === "demo"
        ? DEMO_IP_LIMIT
        : LOGIN_IP_LIMIT;
  const ipRetryAfter = consumeRateLimit(`auth:${action}:ip:${address}`, ipLimit);
  if (ipRetryAfter !== null) return rateLimitError(ipRetryAfter);

  if (action === "login" && email) {
    const identityRetryAfter = consumeRateLimit(
      `auth:login:identity:${email}`,
      LOGIN_IDENTITY_LIMIT,
    );
    if (identityRetryAfter !== null) return rateLimitError(identityRetryAfter);
  }

  return null;
}

function bodyTooLarge(request: NextRequest): boolean {
  const contentLength = request.headers.get("content-length");
  if (contentLength === null) return false;
  const size = Number(contentLength);
  return !Number.isSafeInteger(size) || size < 0 || size > MAX_AUTH_BODY_BYTES;
}

async function readAuthBody(request: NextRequest): Promise<AuthBody | null> {
  if (bodyTooLarge(request)) return null;
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return null;
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_AUTH_BODY_BYTES) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return parseAuthBody(parsed);
  } catch {
    return null;
  }
}

async function resolveSessionUser(
  payload: { uid: string; email?: string },
): Promise<SessionUser | null> {
  return (
    (payload.email ? findUserByEmail(payload.email) : null) ??
    findUserByUid(payload.uid)
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const securityError = requestSecurityError(request);
  if (securityError) return securityError;

  await delay(jitter(240));

  let payload: Awaited<ReturnType<typeof verifySessionToken>>;
  try {
    payload = await verifySessionToken(
      request.cookies.get(SESSION_COOKIE)?.value,
    );
  } catch {
    return apiError(
      "session_unavailable",
      "The auth service is unavailable. Please try again later.",
      503,
    );
  }

  if (payload) {
    try {
      const user = await resolveSessionUser(payload);
      if (user) return sessionResponse(user);
    } catch (error) {
      return authInfrastructureError("session_lookup", error);
    }
  }

  if (DEMO_MODE && !request.cookies.get(SIGNED_OUT_COOKIE)) {
    try {
      const demoUser = findUserByEmail(DEMO_EMAIL);
      if (demoUser) {
        const res = sessionResponse(demoUser);
        setSessionCookie(res, await createSessionToken(demoUser));
        return res;
      }
    } catch (error) {
      return authInfrastructureError("demo_session", error);
    }
  }

  return sessionResponse(null);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const securityError = requestSecurityError(request);
  if (securityError) return securityError;

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return apiError(
      "invalid_content_type",
      "Authentication requests must use JSON.",
      415,
    );
  }

  const body = await readAuthBody(request);
  if (!body) {
    return apiError("invalid_request", "Invalid authentication request.", 400);
  }

  await delay(jitter(260));

  const action = body.action ?? "login";
  if (action.length > MAX_ACTION_LENGTH) {
    return apiError("invalid_action", "Unknown session action.", 400);
  }

  const email = normalizeEmail(body.email);
  const rateLimitErrorResponse = rateLimitFor(request, action, email);
  if (rateLimitErrorResponse) return rateLimitErrorResponse;

  if (action === "logout") {
    try {
      await revokeSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
      const res = sessionResponse(null);
      clearSessionCookie(res);
      setSignedOutCookie(res);
      return res;
    } catch (error) {
      return authInfrastructureError(action, error);
    }
  }

  let user: SessionUser | null = null;

  if (action === "demo") {
    if (!DEMO_MODE || process.env.NODE_ENV !== "development") {
      return apiError("demo_unavailable", "Demo sign-in is disabled.", 403);
    }
    try {
      user = findUserByEmail(DEMO_EMAIL);
    } catch (error) {
      return authInfrastructureError(action, error);
    }
    if (!user) {
      return apiError(
        "demo_unavailable",
        "Demo sign-in is unavailable.",
        503,
      );
    }
  } else if (action === "login") {
    const password = validPassword(body.password);
    if (!email || password === null || password.length < 8) {
      return apiError(
        "invalid_credentials",
        "Incorrect email or password.",
        401,
      );
    }
    try {
      const account = findAccountByEmail(email);
      if (!account || !verifyPassword(password, account)) {
        return apiError(
          "invalid_credentials",
          "Incorrect email or password.",
          401,
        );
      }
      user = account.user;
    } catch (error) {
      return authInfrastructureError(action, error);
    }
  } else if (action === "register") {
    if (!email) {
      return apiError("invalid_email", "Enter a valid email address.", 422);
    }
    if (body.password === undefined) {
      return apiError(
        "weak_password",
        "Password must be at least 8 characters.",
        422,
      );
    }
    if (body.password.length > MAX_PASSWORD_LENGTH) {
      return apiError("password_too_long", "Password is too long.", 422);
    }
    const password = validPassword(body.password);
    if (password === null) {
      return apiError("invalid_request", "Invalid authentication request.", 400);
    }
    if (password.length < 8) {
      return apiError(
        "weak_password",
        "Password must be at least 8 characters.",
        422,
      );
    }
    const displayName = normalizeDisplayName(body.display_name);
    if (!displayName) {
      return apiError(
        "invalid_display_name",
        "Display name must be 2 to 48 characters.",
        422,
      );
    }
    if (DEMO_MODE && email === "taken@zapsters.dev") {
      return apiError(
        "email_taken",
        "An account with this email already exists.",
        409,
      );
    }
    let result: ReturnType<typeof createAccount>;
    try {
      result = createAccount({
        display_name: displayName,
        email,
        password,
      });
    } catch (error) {
      return authInfrastructureError(action, error);
    }
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

  if (!user) {
    return apiError(
      "authentication_failed",
      "Authentication could not be completed.",
      500,
    );
  }

  try {
    await revokeSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    const res = sessionResponse(user);
    setSessionCookie(res, await createSessionToken(user));
    clearSignedOutCookie(res);
    return res;
  } catch (error) {
    return authInfrastructureError(action, error);
  }
}
