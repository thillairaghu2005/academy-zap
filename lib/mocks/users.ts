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
