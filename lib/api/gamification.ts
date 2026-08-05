/**
 * Mock Gamification Engine API.
 *
 * Every function is async/network-shaped (Promise + realistic latency) and
 * mirrors a real backend read surface. The discipline rule (§2.6 of the
 * gamification doc): rank, XP, streaks, and leaderboard positions are never
 * computed client-side — the client only ever PREVIEWS numbers derived from
 * the mock ledger (lib/mocks/gamification.ts), exactly like the real engine
 * derives them from xp_ledger.
 *
 * Mock rules (deterministic, demoable):
 *  - user id "missing-user" → 404 (empty state)
 *  - user id "boom"         → 503 (error state)
 */

import type {
  Badge,
  BadgeVerifyResult,
  GuildStanding,
  GuildVsGuild,
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardScope,
  LeagueStanding,
  ProgressContext,
  RankLevel,
  SeasonPassState,
  ShareCardData,
  SkillTreeNode,
  StreakState,
} from "@/lib/contracts/gamification";
import {
  buildGuildBoard,
  buildGuildVsGuild,
  buildLeaderboard,
  buildMyStanding,
  buildSeasonPass,
  buildShareCard,
  contextForUser,
  MOCK_BADGES,
  MOCK_SKILL_TREE,
  verifyCredential,
} from "@/lib/mocks/gamification";
import { RANK_LADDER } from "@/lib/contracts/gamification";
import { MockApiError } from "@/lib/api/errors";
import { delay, jitter } from "@/lib/api/helpers";

const MISSING = "missing-user";
const BOOM = "boom";

function assertReachable(userId: string): void {
  if (userId === MISSING) {
    throw new MockApiError("user_not_found", "This learner has no gamification data yet.", 404);
  }
  if (userId === BOOM) {
    throw new MockApiError("gamification_down", "Gamification engine unreachable (simulated).", 503);
  }
}

/**
 * The ONE frozen object every projection reads (§5.1). Equivalent to the
 * real GET /gamification/context — everything else below is a projection
 * over this same derived data.
 */
export async function getProgressContext(userId: string): Promise<ProgressContext> {
  await delay(jitter(280));
  assertReachable(userId);
  const context = await contextForUser(userId);
  if (!context) {
    throw new MockApiError("user_not_found", "No progress context for this learner.", 404);
  }
  return context;
}

/** The §5.2 ladder — server-owned constants (thresholds live in rules.py). */
export async function getRankLadder(): Promise<RankLevel[]> {
  await delay(jitter(120));
  return RANK_LADDER;
}

/** Streak projection (re-derived from the same context, never client math). */
export async function getStreak(userId: string): Promise<StreakState> {
  await delay(jitter(160));
  const context = await contextForUser(userId);
  if (!context) throw new MockApiError("user_not_found", "No streak for this learner.", 404);
  return context.streak;
}

/** League standing projection. */
export async function getLeagueStanding(userId: string): Promise<LeagueStanding | null> {
  await delay(jitter(160));
  const context = await contextForUser(userId);
  if (!context) throw new MockApiError("user_not_found", "No league standing for this learner.", 404);
  return context.league;
}

/** ZRANGE-shaped paginated leaderboard read (Redis sorted-set projection). */
export async function getLeaderboard(
  scope: LeaderboardScope,
  offset: number,
  userId: string,
  displayName: string,
): Promise<LeaderboardPage> {
  await delay(jitter(240));
  assertReachable(userId);
  const ctx = await contextForUser(userId);
  const myScore = ctx
    ? ctx.rank.completion_xp + ctx.rank.mastery_xp
    : undefined;
  return buildLeaderboard(scope, offset, myScore !== undefined
    ? { user_id: userId, display_name: displayName, score: myScore }
    : null);
}

/** ZRANK-shaped read of the user's own standing — pinned above the board. */
export async function getMyStanding(
  scope: LeaderboardScope,
  userId: string,
  displayName: string,
): Promise<LeaderboardEntry | null> {
  await delay(jitter(160));
  assertReachable(userId);
  const ctx = await contextForUser(userId);
  if (!ctx) return null;
  return buildMyStanding(scope, {
    user_id: userId,
    display_name: displayName,
    score: ctx.rank.completion_xp + ctx.rank.mastery_xp,
  });
}

/** Guild board: members + combined XP rollup (§5.3 GuildRollup). */
export async function getGuildBoard(userId: string): Promise<GuildStanding> {
  await delay(jitter(220));
  assertReachable(userId);
  const ctx = await contextForUser(userId);
  if (!ctx?.guild) {
    throw new MockApiError("no_guild", "This learner is not in a guild this season.", 404);
  }
  return buildGuildBoard();
}

/** Guild-vs-guild comparison for the guild board page. */
export async function getGuildVsGuild(userId: string): Promise<GuildVsGuild> {
  await delay(jitter(220));
  assertReachable(userId);
  return buildGuildVsGuild();
}

/** Badge wall — statuses are current truth at the stable verify URL. */
export async function getBadges(userId: string): Promise<Badge[]> {
  await delay(jitter(200));
  assertReachable(userId);
  if (userId === MISSING) return [];
  return MOCK_BADGES;
}

/**
 * Independent re-verification of a credential (§7.3) — the mock stand-in for
 * GET /verify/{credential_id}. Built all three states: verified / flagged /
 * revoked (plus 404 for unknown credentials).
 */
export async function verifyBadge(credentialId: string): Promise<BadgeVerifyResult> {
  await delay(jitter(260));
  const result = verifyCredential(credentialId);
  if (!result) {
    throw new MockApiError(
      "credential_not_found",
      "No credential with this id exists — it may be a forged or edited screenshot.",
      404,
    );
  }
  return result;
}

/** Skill tree projection — category-level completion XP only (§6). */
export async function getSkillTree(userId: string): Promise<SkillTreeNode[]> {
  await delay(jitter(240));
  assertReachable(userId);
  if (userId === MISSING) return [];
  return MOCK_SKILL_TREE;
}

/** Share-card data — hash-stamped so a shared image is independently verifiable. */
export async function getShareCard(userId: string): Promise<ShareCardData> {
  await delay(jitter(180));
  assertReachable(userId);
  return buildShareCard();
}

/** Season Pass track (lower priority — billing is a separate platform concern). */
export async function getSeasonPass(userId: string): Promise<SeasonPassState> {
  await delay(jitter(200));
  assertReachable(userId);
  return buildSeasonPass();
}
