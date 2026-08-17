import {
  getLeaderboardFromApi,
  getMyProgressFromApi,
  getMyStandingFromApi,
} from "@/lib/api/client";
import type {
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardScope,
  LeagueStanding,
  ProgressContext,
  StreakState,
} from "@/lib/contracts/gamification";
import { AUTH_MODE } from "@/lib/config";
import {
  getLeaderboard as getDemoLeaderboard,
  getMyStanding as getDemoMyStanding,
  getProgressContext as getDemoProgressContext,
  getPublicLeaderboardPreview as getDemoPublicLeaderboardPreview,
} from "./engines/gamification";

/**
 * Gamification data boundary (slice 04 §12-§14, slice 05 §8).
 *
 * `AUTH_MODE=demo`  → isolated demo fixtures; the demo service derives rank/XP/streak and the
 *                     client only renders it.
 * `AUTH_MODE=backend` → the authoritative FastAPI ProgressContext (`GET /me/progress`), which
 *                     the backend recomputes from the append-only XP ledger after every
 *                     accepted event. The frontend never calculates XP in either mode.
 */
export async function getProgressContext(userId: string): Promise<ProgressContext> {
  if (AUTH_MODE === "backend") return getMyProgressFromApi();
  return getDemoProgressContext(userId);
}

/** §5.3 StreakState — always the streak field of the SAME ProgressContext the rank/dashboard
 * render. Never a second source of truth in backend mode (slice 05 §8). */
export async function getStreak(userId: string): Promise<StreakState> {
  return (await getProgressContext(userId)).streak;
}

/** §5.3 LeagueStanding — derived from the SAME ProgressContext (null when unplaced). */
export async function getLeagueStanding(userId: string): Promise<LeagueStanding | null> {
  return (await getProgressContext(userId)).league;
}

/** §5.5 Leaderboard page — backend mode reads the Redis sorted-set projection read API
 * (`GET /leaderboards/{scope}`); demo mode reads the isolated demo projection. The frontend
 * never sorts, scores, or ranks locally — it renders the server-provided result.
 * `limit` defaults to the API's page size; the locked UI pages with offset. */
export async function getLeaderboard(
  scope: LeaderboardScope,
  offset: number,
  userId: string,
  displayName: string,
): Promise<LeaderboardPage> {
  if (AUTH_MODE === "backend") {
    const page = await getLeaderboardFromApi(scope, offset, 10);
    return { ...page, scope: page.scope as LeaderboardScope };
  }
  return getDemoLeaderboard(scope, offset, userId, displayName);
}

/** §5.5 "My standing" — backend mode reads `GET /leaderboards/{scope}/me` (server-derived
 * position, O(log N)); demo mode reads the isolated demo projection. */
export async function getMyStanding(
  scope: LeaderboardScope,
  userId: string,
  displayName: string,
): Promise<LeaderboardEntry | null> {
  if (AUTH_MODE === "backend") {
    const standing = await getMyStandingFromApi(scope);
    return standing ? { ...standing, guild_id: undefined } : null;
  }
  return getDemoMyStanding(scope, userId, displayName);
}

/** §5.5 Public homepage preview — backend mode reads the public `GET /leaderboards/global`
 * top slice (no auth required, same read model); demo mode reads the demo projection. */
export async function getPublicLeaderboardPreview(): Promise<LeaderboardPage> {
  if (AUTH_MODE === "backend") {
    const page = await getLeaderboardFromApi("global", 0, 5);
    return { ...page, scope: "global" };
  }
  return getDemoPublicLeaderboardPreview();
}

export {
  getBadges,
  getGuildBoard,
  getGuildVsGuild,
  getLedgerAudit,
  getLedgerEntriesForAuditEvent,
  getLedgerEntry,
  getLedgerEntryDetail,
  getPublicGuildBoard,
  getRankLadder,
  getSeasonPass,
  getShareCard,
  getSkillTree,
  reconcileLedgerBalance,
  verifyBadge,
} from "./engines/gamification";
export type { LedgerReconciliation } from "./engines/gamification";
