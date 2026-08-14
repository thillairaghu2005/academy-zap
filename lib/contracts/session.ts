/**
 * Session / auth contract — PROVISIONAL (see assumption register in index.ts).
 *
 * The source docs do not define a User schema. This is the minimal shape the
 * frontend demo shell needs today: identity and role for navigation.
 */

export type SessionRole =
  | "user"
  | "instructor"
  | "org_admin"
  | "platform_ops"
  // Legacy fixture roles remain type-compatible for deferred demo surfaces only.
  | "student"
  | "learner"
  | "admin";

export interface SessionUser {
  /** Stable identity issued by Platform Core. */
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  role: SessionRole;
  /** B2B org scoping (null for consumer accounts) */
  org_id: string | null;
}

export type SessionStatus = "loading" | "authenticated" | "anonymous";

export interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  display_name: string;
  email: string;
  password: string;
}
