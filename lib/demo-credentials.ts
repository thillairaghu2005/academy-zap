/**
 * Demo credentials for the seeded demo account (see lib/server/accounts.ts).
 *
 * Client-safe constants — the login form prefills these and the one-click
 * demo sign-in submits them through the REAL credential path (they are
 * validated server-side against the seeded scrypt hash, never hardcoded in
 * the route). The server seeds these same values so both sides agree.
 */
export const DEMO_EMAIL = "demo@company.com";
export const DEMO_PASSWORD = "Demo@123";

/** Demo admin credential (the priya@zapsters.dev account). */
export const DEMO_ADMIN_EMAIL = "priya@admin.zapsters.dev";
export const DEMO_ADMIN_PASSWORD = "Admin@123";
