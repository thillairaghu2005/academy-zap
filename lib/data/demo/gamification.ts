import {
  getCurrentSeasonFromApi,
  getLeaderboardFromApi,
  getMyBadgesFromApi,
  getMyLeagueBoardFromApi,
  getMyLeagueFromApi,
  getMyProgressFromApi,
  getMyStandingFromApi,
  verifyCredentialFromApi,
} from "@/lib/api/client";
import type {
  Badge,
  BadgeVerifyResult,
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardScope,
  LeagueBoard,
  LeagueStanding,
  ProgressContext,
  SeasonSummary,
  StreakState,
} from "@/lib/contracts/gamification";
import { AUTH_MODE } from "@/lib/config";
import {
  getBadges as getDemoBadges,
  getCurrentSeason as getDemoSeason,
  getLeagueBoard as getDemoLeagueBoard,
  getLeaderboard as getDemoLeaderboard,
  getMyStanding as getDemoMyStanding,
  getProgressContext as getDemoProgressContext,
  getPublicLeaderboardPreview as getDemoPublicLeaderboardPreview,
  verifyBadge as getDemoVerifyBadge,
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

/** §5.3 LeagueStanding — backend mode reads the authoritative `GET /me/league` (season
 * XP sliced from the XP ledger, rank from the Redis tier projection); demo mode derives it
 * from the SAME ProgressContext (null when unplaced). The frontend never computes the
 * standing in either mode. */
export async function getLeagueStanding(userId: string): Promise<LeagueStanding | null> {
  if (AUTH_MODE === "backend") return getMyLeagueFromApi();
  return (await getProgressContext(userId)).league;
}

/** Slice 09 — the active season's public metadata (`GET /seasons/current`), or null when no
 * season exists. Demo mode returns the isolated demo season fixture. */
export async function getCurrentSeason(): Promise<SeasonSummary | null> {
  if (AUTH_MODE === "backend") {
    const result = await getCurrentSeasonFromApi();
    return result.season ? { ...result.season, status: result.status } : null;
  }
  return getDemoSeason();
}

/** Slice 09 — the caller's tier board (`GET /me/league/leaderboard`). Backend mode reads
 * the Redis tier projection; demo mode reads the isolated demo board. */
export async function getMyLeagueBoard(
  offset: number,
  limit: number,
  userId: string,
  displayName: string,
): Promise<LeagueBoard> {
  if (AUTH_MODE === "backend") {
    const board = await getMyLeagueBoardFromApi(offset, limit);
    return { ...board, tier: board.tier as LeagueBoard["tier"] };
  }
  return getDemoLeagueBoard(offset, limit, userId, displayName);
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

/** §7.3 Badge wall — backend mode reads `GET /me/badges` (authoritative awards + signed
 * credentials); demo mode reads the isolated demo fixture. The frontend never computes
 * badge eligibility in either mode. */
export async function getBadges(userId: string): Promise<Badge[]> {
  if (AUTH_MODE === "backend") return getMyBadgesFromApi();
  return getDemoBadges(userId);
}

/** §7.3 Independent re-verification — backend mode reads the public `GET /verify/{id}`
 * (read-only, server-side signature re-verification); demo mode reads the demo fixture.
 * The verify page is public, so this must work without a session in both modes. */
export async function verifyBadge(credentialId: string): Promise<BadgeVerifyResult> {
  if (AUTH_MODE === "backend") return verifyCredentialFromApi(credentialId);
  return getDemoVerifyBadge(credentialId);
}

export {
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
} from "./engines/gamification";
export type { LedgerReconciliation } from "./engines/gamification";
