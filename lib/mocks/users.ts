import type { SessionUser } from "@/lib/contracts/session";

/**
 * Mock session fixtures.
 *
 * Realistic enough to exercise every session state the shell needs:
 * authenticated (demo learner), and the admin variant used to gate the
 * Admin/CMS route (F7).
 */

export const MOCK_LEARNER: SessionUser = {
  id: "4c1e0a9f-8c6e-4b2d-9f3a-2b8d1e5c7a91",
  display_name: "Aarav Mehta",
  email: "aarav@zapsters.dev",
  avatar_url: null,
  role: "learner",
  org_id: null,
};

export const MOCK_ADMIN: SessionUser = {
  id: "7f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81",
  display_name: "Priya Nair",
  email: "priya@zapsters.dev",
  avatar_url: null,
  role: "admin",
  org_id: null,
};

/**
 * Mock reviewer identities for the F7 two-person review flow. With no real
 * auth yet, the "different reviewer" rule needs a picker of fake admins —
 * this is that pool (build.md F7: mirror the rule even before it's
 * enforced server-side). The submitted_by of seeded in-review courses
 * points at one of these so the rule is actually exercisable.
 */
export const MOCK_REVIEWERS: SessionUser[] = [
  MOCK_ADMIN,
  {
    id: "2a4c6e8f-0b1d-4c3e-8f5a-9b7c1d3e5f7a",
    display_name: "Meera Patel",
    email: "meera@zapsters.dev",
    avatar_url: null,
    role: "admin",
    org_id: null,
  },
  {
    id: "3b5d7f9a-1c2e-4d4f-9a6b-0c8d2e4f6a8b",
    display_name: "Diego Fernández",
    email: "diego@zapsters.dev",
    avatar_url: null,
    role: "admin",
    org_id: null,
  },
];
