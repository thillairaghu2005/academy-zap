import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import type { SessionUser } from "@/lib/contracts/session";
import { MOCK_LEARNER } from "@/lib/mocks/users";

interface AccountRecord {
  user: SessionUser;
  salt: string;
  passwordHash: string;
}

const byEmail = new Map<string, AccountRecord>();
const byUid = new Map<string, AccountRecord>();

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

/**
 * Coerce an untrusted value to a string before hashing/compare — a
 * malformed client that posts a non-string password must fail the check,
 * not throw inside scryptSync.
 */
function toPasswordString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function insertAccount(user: SessionUser, password: string): void {
  const key = user.email.toLowerCase();
  if (byEmail.has(key)) return; // idempotent — never duplicates an email
  const salt = randomBytes(16).toString("hex");
  const record: AccountRecord = {
    user,
    salt,
    passwordHash: hashPassword(password, salt),
  };
  byEmail.set(key, record);
  byUid.set(user.id, record);
}

let demoSeeded = false;

function isDevelopmentDemoMode(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.APP_ENV !== "production" &&
    process.env.APP_ENV !== "staging" &&
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  );
}

/** Seed only the learner fixture, and only for an explicit local demo. */
function seedDevelopmentDemo(): void {
  insertAccount(MOCK_LEARNER, randomBytes(32).toString("base64url"));
}

export function ensureSeeded(): void {
  if (isDevelopmentDemoMode() && !demoSeeded) {
    seedDevelopmentDemo();
    demoSeeded = true;
  }
}

function canonicalEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findAccountByEmail(email: string): AccountRecord | null {
  ensureSeeded();
  return byEmail.get(canonicalEmail(email)) ?? null;
}

export function findUserByEmail(email: string): SessionUser | null {
  return findAccountByEmail(email)?.user ?? null;
}

export function findUserByUid(uid: string): SessionUser | null {
  ensureSeeded();
  return byUid.get(uid)?.user ?? null;
}

/** Constant-time password check against the account's stored hash. */
export function verifyPassword(
  password: unknown,
  account: AccountRecord,
): boolean {
  const candidate = Buffer.from(
    hashPassword(toPasswordString(password), account.salt),
    "hex",
  );
  const expected = Buffer.from(account.passwordHash, "hex");
  return (
    candidate.length === expected.length &&
    timingSafeEqual(candidate, expected)
  );
}

/**
 * Register a new account. Returns `created` with the new user on success,
 * or `exists` when the email is already taken (caller maps that to 409).
 */
export function createAccount(input: {
  display_name: string;
  email: string;
  password: string;
}): { status: "created"; user: SessionUser } | { status: "exists" } {
  ensureSeeded();
  // Canonicalize the same way lookups do so registration and login agree.
  const key = canonicalEmail(input.email);
  if (byEmail.has(key)) return { status: "exists" };
  const user: SessionUser = {
    id: globalThis.crypto.randomUUID(),
    display_name: toPasswordString(input.display_name).trim() || "New Learner",
    email: key,
    avatar_url: null,
    role: "learner",
    org_id: null,
  };
  insertAccount(user, toPasswordString(input.password));
  return { status: "created", user };
}
