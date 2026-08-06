/**
 * Account directory — the mock backend's "users table".
 *
 * Stand-in for the Platform Core auth database (build.md §4): an in-memory
 * credential store with REAL password hashing (node:crypto scrypt, per-user
 * salt, constant-time compare). The session cookie itself is issued by
 * lib/server/session.ts; this module only answers "who is this email, and
 * does this password match?".
 *
 * Seeding is idempotent:
 *  - `ensureSeeded()` runs automatically on first use (first startup).
 *  - `insertAccount` refuses to create a duplicate email, so hot reloads
 *    and repeated startups never double-seed.
 * The demo account (demo@company.com / Demo@123) is created on first
 * startup if and only if it does not already exist.
 *
 * The demo account shares the demo learner's uid (MOCK_LEARNER.id) so every
 * mock surface keyed by that id — enrollments, gamification ledger, support
 * tickets — resolves for the demo login, while the session presents the
 * account's own email. aarav@zapsters.dev is the same identity under its
 * canonical email. `priya@admin.zapsters.dev` is aliased to the admin
 * account for the existing "Admin demo" affordance.
 *
 * This module is NODE-ONLY (node:crypto) and must never be imported by
 * client code; only the /api/auth/session route handler uses it.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import type { SessionUser } from "@/lib/contracts/session";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-credentials";
import { MOCK_ADMIN, MOCK_LEARNER, MOCK_REVIEWERS } from "@/lib/mocks/users";

/** Demo admin credential (the priya@zapsters.dev account). */
export const ADMIN_PASSWORD = "Admin@123";
/** Demo learner's own email (same uid as the demo account). */
export const LEARNER_EMAIL = "aarav@zapsters.dev";
export const LEARNER_PASSWORD = "Learner@123";
/** Reviewer pool credential (meera / diego). */
export const REVIEWER_PASSWORD = "Reviewer@123";

interface AccountRecord {
  user: SessionUser;
  salt: string;
  passwordHash: string;
}

/** The demo account — same demo identity (uid) as MOCK_LEARNER. */
const DEMO_ACCOUNT: SessionUser = {
  id: MOCK_LEARNER.id,
  display_name: MOCK_LEARNER.display_name,
  email: DEMO_EMAIL,
  avatar_url: null,
  role: "learner",
  org_id: null,
};

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
function toPasswordString(value: string): string {
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

let seeded = false;

/** Idempotent seed — runs automatically on first startup via ensureSeeded. */
function seed(): void {
  insertAccount(DEMO_ACCOUNT, DEMO_PASSWORD);
  insertAccount(MOCK_LEARNER, LEARNER_PASSWORD);
  insertAccount(MOCK_ADMIN, ADMIN_PASSWORD);
  for (const reviewer of MOCK_REVIEWERS) {
    // MOCK_REVIEWERS includes MOCK_ADMIN — insertAccount dedupes by email.
    insertAccount(reviewer, REVIEWER_PASSWORD);
  }
}

export function ensureSeeded(): void {
  if (!seeded) {
    seed();
    seeded = true;
  }
}

/**
 * Canonicalize an email for lookup. Legacy mock affordance: the demo admin
 * signs in at `priya@admin.zapsters.dev`, so that domain aliases to the
 * matching @zapsters.dev account (the password is still validated).
 */
function canonicalEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/@admin\.zapsters\.dev$/, "@zapsters.dev");
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
  password: string,
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
  // Canonicalize the SAME way lookups do (trim/lower + @admin.zapsters.dev
  // alias) so a registered account is always reachable at login — insert
  // and lookup must agree on the key.
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
