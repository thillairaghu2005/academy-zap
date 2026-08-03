/**
 * Zapsters — mock API layer
 * =========================
 *
 * One module per subsystem, each exporting functions with the SAME
 * signatures the backend `Protocol` classes will have (platform §4.1):
 *
 *   content.ts       → getCourse, getPlaybackManifest         (F1)
 *   judge.ts         → submit, getResult                      (F2)
 *   labs.ts          → provisionSession, terminateSession,
 *                      checkObjective                         (F3)
 *   assessments.ts   → submitAnswer                           (F4)
 *   payments.ts      → createCheckout, verifyWebhook          (F6)
 *   gamification.ts  → ProgressContext/rank/streak/league/guild
 *                      projections                            (F5)
 *
 * Every function is async/network-shaped (Promise + realistic delay),
 * readable by TanStack Query today, and swappable for a real fetch later
 * with zero component changes. Components NEVER inline mock data or
 * re-derive server-owned numbers (XP, rank, verdicts) — build.md §3.
 */

export * from "./auth";
