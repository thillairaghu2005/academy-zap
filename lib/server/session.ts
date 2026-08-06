/**
 * Server-side session utilities (product-audit Fix 4: real auth boundary).
 *
 * The session is a signed, expiring cookie token (HMAC-SHA256) issued by the
 * /api/auth/session route handler and verified by proxy.ts on every
 * protected request. That gives the mock frontend a REAL boundary shape:
 * HttpOnly cookie, SameSite=Lax, server-issued, middleware-enforced — the
 * exact contract the future Platform Core auth replaces (build.md §4).
 *
 * Security note (flagged): the signing secret falls back to a mock constant
 * when SESSION_SECRET is not set — except in production, where the first
 * sign/verify THROWS (fail-closed, audit A4) rather than signing with a
 * publicly-known constant. Note the failure mode: verifySessionToken calls
 * sign() inside proxy.ts, which has no try/catch, so a misconfigured
 * production box 500s every protected request until SESSION_SECRET is set.
 * Real Platform Core auth will own tokens entirely; this is the swappable
 * stand-in.
 *
 * This module is edge-safe (Web Crypto only) so the Node route handler and
 * the edge middleware can both import it. It must never import client code.
 */

export const SESSION_COOKIE = "zapsters_session";
/** Set on logout so the demo auto-auth does not immediately re-issue. */
export const SIGNED_OUT_COOKIE = "zapsters_signed_out";

// Fail fast when the signing boundary is actually used (audit A4): a
// production deployment that forgets SESSION_SECRET must not silently sign
// tokens with a publicly-known constant. The check is lazy (inside
// getSecret) so `next build` page-data collection and dev runs stay
// frictionless — the first real sign/verify in production without the env
// var throws a clear error instead of booting insecure.
function getSecret(): string {
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set in production — refusing to sign sessions with the mock secret.",
    );
  }
  return process.env.SESSION_SECRET ?? "zapsters-mock-session-secret";
}
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  uid: string;
  role: string;
  /**
   * The email the user authenticated as. Multiple emails can share a uid
   * (demo@company.com vs aarav@zapsters.dev are the same demo identity),
   * so the token records WHICH principal signed in — the session resolver
   * prefers this over uid to present the right account.
   */
  email?: string;
  exp: number;
}

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return b64urlEncode(new Uint8Array(signature));
}

/** Constant-time string comparison (no early exit on length-matched input). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Issue a signed session token for a user (uid + role + email travel in the token). */
export async function createSessionToken(user: {
  id: string;
  role: string;
  email?: string;
}): Promise<string> {
  const payload: SessionPayload = {
    uid: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  if (user.email) payload.email = user.email;
  const encoded = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await sign(encoded)}`;
}

/**
 * Verify a session token: signature check (tamper-evident) + expiry check.
 * Returns the payload, or null when absent/invalid/expired.
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!encoded || !signature) return null;

  const expected = await sign(encoded);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(encoded)),
    ) as SessionPayload;
    if (
      !payload ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
