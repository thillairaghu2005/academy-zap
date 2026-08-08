/**
 * Session / auth contract — PROVISIONAL (see assumption register in index.ts).
 *
 * The source docs do not define a User schema; Platform Core (backend,
 * later) owns auth. This is the minimal shape the shell needs today:
 * identity + role for nav gating. It will be reconciled with the real
 * Platform Core contract during integration (build.md §4).
 */

export type SessionRole = "student" | "learner" | "admin";

export interface SessionUser {
  /** UUID, server-assigned */
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
