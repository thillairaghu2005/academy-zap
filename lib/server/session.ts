export const SESSION_COOKIE = "zapsters_session";
/** Prevents development demo auto-auth from undoing a logout. */
export const SIGNED_OUT_COOKIE = "zapsters_signed_out";

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MAX_TOKEN_LENGTH = 2048;

interface StoredSession {
  uid: string;
  role: string;
  email?: string;
  exp: number;
}

interface SessionEnvelope {
  sid: string;
  exp: number;
  uid: string;
  role: string;
  email?: string;
}

declare global {
  var __zapstersSessionStore: Map<string, StoredSession> | undefined;
  var __zapstersRevokedSessionIds: Set<string> | undefined;
}

// A global registry keeps the in-memory stand-in shared between Next server
// bundles in the same process. A real deployment should replace this with a
// shared session store so revocation works across replicas.
const activeSessions =
  globalThis.__zapstersSessionStore ??
  (globalThis.__zapstersSessionStore = new Map<string, StoredSession>());
const revokedSessionIds =
  globalThis.__zapstersRevokedSessionIds ??
  (globalThis.__zapstersRevokedSessionIds = new Set<string>());

const developmentSecretBytes = new Uint8Array(32);
globalThis.crypto.getRandomValues(developmentSecretBytes);

export function isProductionLikeRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.APP_ENV === "production" ||
    process.env.APP_ENV === "staging"
  );
}

function getSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) return configured;
  if (isProductionLikeRuntime()) {
    throw new Error(
      "SESSION_SECRET must be set in production-like runtimes.",
    );
  }
  return b64urlEncode(developmentSecretBytes);
}

export interface SessionPayload {
  sid: string;
  uid: string;
  role: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSessionEnvelope(value: unknown): value is SessionEnvelope {
  return (
    isRecord(value) &&
    typeof value.sid === "string" &&
    value.sid.length > 0 &&
    value.sid.length <= 128 &&
    typeof value.exp === "number" &&
    Number.isSafeInteger(value.exp) &&
    typeof value.uid === "string" &&
    value.uid.length > 0 &&
    value.uid.length <= 256 &&
    typeof value.role === "string" &&
    value.role.length > 0 &&
    value.role.length <= 32 &&
    (value.email === undefined ||
      (typeof value.email === "string" && value.email.length <= 254))
  );
}

function purgeExpiredSessions(now: number): void {
  for (const [sid, session] of activeSessions) {
    if (session.exp <= now) activeSessions.delete(sid);
  }
}

/** Issue a signed token containing a revocable session ID and its claims. */
export async function createSessionToken(user: {
  id: string;
  role: string;
  email?: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  purgeExpiredSessions(now);
  const envelope: SessionEnvelope = {
    sid: globalThis.crypto.randomUUID(),
    exp: now + SESSION_MAX_AGE_SECONDS,
    uid: user.id,
    role: user.role,
    ...(user.email ? { email: user.email } : {}),
  };
  const stored: StoredSession = {
    uid: user.id,
    role: user.role,
    exp: envelope.exp,
  };
  if (user.email) stored.email = user.email;
  activeSessions.set(envelope.sid, stored);
  const encoded = b64urlEncode(
    new TextEncoder().encode(JSON.stringify(envelope)),
  );
  return `${encoded}.${await sign(encoded)}`;
}

/**
 * Verify a session token: signature check (tamper-evident) + expiry check.
 * Returns the payload, or null when absent/invalid/expired.
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!encoded || !signature || token.indexOf(".", dot + 1) !== -1) return null;

  const expected = await sign(encoded);
  if (!safeEqual(signature, expected)) return null;

  try {
    const parsed: unknown = JSON.parse(
      new TextDecoder().decode(b64urlDecode(encoded)),
    );
    if (!isSessionEnvelope(parsed)) return null;
    if (revokedSessionIds.has(parsed.sid)) return null;

    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp <= now) {
      activeSessions.delete(parsed.sid);
      return null;
    }

    const stored = activeSessions.get(parsed.sid);
    if (stored && (stored.exp !== parsed.exp || stored.exp <= now)) {
      activeSessions.delete(parsed.sid);
      return null;
    }

    // The signed envelope keeps verification working across serverless
    // instances. The local registry still provides revocation within one
    // running instance, which is the strongest guarantee available without a
    // shared backend.
    const resolved = stored ?? {
      uid: parsed.uid,
      role: parsed.role,
      ...(parsed.email ? { email: parsed.email } : {}),
      exp: parsed.exp,
    };

    return {
      sid: parsed.sid,
      uid: resolved.uid,
      role: resolved.role,
      ...(resolved.email ? { email: resolved.email } : {}),
      exp: resolved.exp,
    };
  } catch {
    return null;
  }
}

/** Revoke a session before clearing its browser cookie. */
export async function revokeSessionToken(
  token: string | undefined | null,
): Promise<void> {
  const session = await verifySessionToken(token);
  if (session) {
    activeSessions.delete(session.sid);
    revokedSessionIds.add(session.sid);
  }
}
