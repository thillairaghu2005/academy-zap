import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import type { SessionUser } from "@/lib/contracts/session";
import { MOCK_LEARNER } from "@/lib/mocks/users";

/** Intentionally public credentials for the frontend-only demo account. */
export const DEMO_EMAIL = "demo@zapsters.dev";
export const DEMO_PASSWORD = "Zapsters@Demo123";

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

function upsertAccount(user: SessionUser, password: string): void {
  const key = canonicalEmail(user.email);
  const existing = byEmail.get(key);
  const salt = randomBytes(16).toString("hex");
  const record: AccountRecord = {
    user: { ...user, email: key },
    salt,
    passwordHash: hashPassword(password, salt),
  };
  byEmail.set(key, record);
  byUid.set(user.id, record);
  if (existing && existing.user.id !== user.id) byUid.delete(existing.user.id);
}

const demoUser: SessionUser = {
  id: MOCK_LEARNER.id,
  display_name: "Demo User",
  email: DEMO_EMAIL,
  avatar_url: null,
  role: "student",
  org_id: null,
};

/** Seed the intentionally public demo account through the normal account path. */
function seedDemoAccount(): void {
  upsertAccount(demoUser, DEMO_PASSWORD);
}

export function ensureSeeded(): void {
  if (!byEmail.has(DEMO_EMAIL)) {
    seedDemoAccount();
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
