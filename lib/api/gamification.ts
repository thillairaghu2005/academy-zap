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
  ContextSnapshot,
  ContextVersionDiff,
  GuildStanding,
  GuildVsGuild,
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardScope,
  LeagueStanding,
  LedgerAuditView,
  LedgerEntry,
  LedgerEntryDetail,
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
  buildLedgerAudit,
  buildMyStanding,
  buildSeasonPass,
  buildShareCard,
  contextForUser,
  demoLedgerEntries,
  findLedgerEntryById,
  ledgerDetailFor,
  MOCK_BADGES,
  MOCK_SKILL_TREE,
  reconciliationFixtures,
  verifyCredential,
} from "@/lib/mocks/gamification";
import { auditEntries, ledgerEntryIdForAuditSeed } from "@/lib/mocks/admin";
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

/**
 * Full audit view for the ledger viewer (§7.2): raw entries, chain status,
 * versioned context snapshots and the diffs between them — the "show me why
 * user X is Rank 7" answer, in mock form.
 */
/* ------------------------------------------------------------------ */
/*  Ledger reads for the admin audit view (Task 3)                     */
/* ------------------------------------------------------------------ */

/** Addressable read of ONE ledger entry (404 for unknown ids). */
export async function getLedgerEntry(id: string): Promise<LedgerEntry> {
  await delay(jitter(180));
  const entry = await findLedgerEntryById(id);
  if (!entry) {
    throw new MockApiError(
      "ledger_entry_not_found",
      "No ledger entry with this id.",
      404,
    );
  }
  return entry;
}

/**
 * Ledger entry plus the server-derived running balance (amount, balance
 * before/after, reason code) — the expandable row of the audit log.
 */
export async function getLedgerEntryDetail(
  id: string,
): Promise<LedgerEntryDetail> {
  await delay(jitter(200));
  const entry = await findLedgerEntryById(id);
  if (!entry) {
    throw new MockApiError(
      "ledger_entry_not_found",
      "No ledger entry with this id.",
      404,
    );
  }
  return ledgerDetailFor(entry);
}

/**
 * The ledger entry linked to an audit event, if any. Resolves the seed
 * marker against the real chained ledger — the client never re-derives a
 * balance (build.md §3). Null for audit rows that never touched XP state.
 */
export async function getLedgerEntriesForAuditEvent(
  auditEventId: string,
): Promise<LedgerEntry | null> {
  await delay(jitter(200));
  const seed = auditEntries.find((e) => e.id === auditEventId);
  if (!seed) {
    throw new MockApiError(
      "audit_event_not_found",
      "No audit event with this id.",
      404,
    );
  }
  const ledgerEntryId = await ledgerEntryIdForAuditSeed(seed);
  if (!ledgerEntryId) return null;
  return (await findLedgerEntryById(ledgerEntryId)) ?? null;
}

/** Server verdict for the reconciliation panel (Task 3). */
export interface LedgerReconciliation {
  user_id: string;
  display_name: string;
  /** What the cached ProgressContext reports. */
  cached_total_xp: number;
  /** What the append-only ledger sums to. */
  ledger_sum: number;
  /** ledger_sum - cached_total_xp, computed server-side (never client math). */
  delta_xp: number;
  entry_count: number;
  /** true when the ledger and the cached balance agree. */
  reconciled: boolean;
}

/**
 * Sum a user's ledger entries and flag a mismatch against the cached
 * balance in ProgressContext — computed ENTIRELY server-side (mock). The
 * panel renders the verdict; it never recomputes balances.
 */
export async function reconcileLedgerBalance(
  userId: string,
): Promise<LedgerReconciliation> {
  await delay(jitter(260));
  assertReachable(userId);
  const fixtures = await reconciliationFixtures();
  const fixture = fixtures.get(userId);
  if (!fixture) {
    throw new MockApiError(
      "user_not_found",
      "No ledger data for this user.",
      404,
    );
  }
  return {
    ...fixture,
    delta_xp: fixture.ledger_sum - fixture.cached_total_xp,
    reconciled: fixture.ledger_sum === fixture.cached_total_xp,
  };
}

export async function getLedgerAudit(userId: string): Promise<LedgerAuditView> {
  await delay(jitter(260));
  assertReachable(userId);
  const ledger = await demoLedgerEntries();
  const audit = await buildLedgerAudit();
  const snapshots: ContextSnapshot[] = audit.snapshots;

  // Diffs between consecutive snapshots (reverse-chronological: newest last).
  const diffs: ContextVersionDiff[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const from = snapshots[i - 1]!;
    const to = snapshots[i]!;
    diffs.push({
      from_version: from.context_version,
      to_version: to.context_version,
      completion_delta: to.completion_xp - from.completion_xp,
      mastery_delta: to.mastery_xp - from.mastery_xp,
      rank_changed: from.rank_name !== to.rank_name || from.level !== to.level,
      from_rank: from.rank_name,
      to_rank: to.rank_name,
    });
  }

  return {
    chain: audit.chain,
    entries: ledger,
    snapshots,
    diffs,
  };
}
