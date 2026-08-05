/**
 * Mock Gamification Engine — ledger → ProgressContext resolution.
 *
 * Implements the §5.4 resolution workflow server-side (in mock form):
 *   1. Ledger read (append-only, nothing mutated).
 *   2. XP aggregation per track (completion / mastery summed independently).
 *   3. Rank resolution — weighted function of (completion_xp, mastery_xp).
 *   4. Streak resolution — last-active vs today, freeze tokens, momentum.
 *   5. League / guild rollup (season-sliced).
 *   6. Integrity flag check → freeze_status.
 *   7. context_version increments (append-only contexts).
 *
 * The hash chain (§7.2) is REAL here: compute_entry_hash is the doc's SHA-256
 * formula, and every fixture entry links prev_hash → entry_hash. The client
 * never sees a rank/XP number that wasn't derived from this ledger.
 *
 * Mock hooks (deterministic, demoable):
 *  - user id "missing-user"        → 404 (empty state)
 *  - user id "boom"                → 503 (error state)
 *  - user id "frozen-demo"         → freeze_status = frozen_pending_review
 *                                    with unresolved_flags (edge case)
 *  - badge credential id "b-flagged" / "b-revoked" → non-verified verify states
 */

import { RANK_LADDER } from "@/lib/contracts/gamification";

import type {
  Badge,
  BadgeVerifyResult,
  FreezeStatus,
  GuildMember,
  GuildStanding,
  GuildVsGuild,
  IntegrityStatus,
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardScope,
  LedgerEntry,
  LedgerEntryDetail,
  LeagueStanding,
  ProgressContext,
  SeasonPassState,
  ShareCardData,
  SkillTreeNode,
  StreakState,
} from "@/lib/contracts/gamification";

/* ------------------------------------------------------------------ */
/*  §7.2 hash chain — the doc's formula, real crypto                   */
/* ------------------------------------------------------------------ */

const GENESIS_HASH = "0".repeat(64);

/**
 * Browser-safe hex SHA-256 (Web Crypto — works in browsers AND Node 26).
 * Returns the doc's §7.2 formula: sha256(prev_hash|user_id|xp_delta|
 * reason_code|created_at).
 */
async function sha256Hex(payload: string): Promise<string> {
  const bytes = new TextEncoder().encode(payload);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** UUID v4 that works in browsers and Node (Web Crypto randomUUID). */
function uuid(): string {
  return globalThis.crypto.randomUUID();
}

export async function computeEntryHash(
  prevHash: string,
  user_id: string,
  xp_delta: number,
  reason_code: string,
  created_at: string,
): Promise<string> {
  const payload = `${prevHash}|${user_id}|${xp_delta}|${reason_code}|${created_at}`;
  return sha256Hex(payload);
}

export async function verifyLedgerChain(entries: LedgerEntry[]): Promise<{
  valid: boolean;
  broken_at: number | null;
}> {
  let prev = GENESIS_HASH;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (e.prev_hash !== prev) return { valid: false, broken_at: i };
    const recomputed = await computeEntryHash(
      prev,
      e.user_id,
      e.xp_delta,
      e.reason_code,
      e.created_at,
    );
    if (recomputed !== e.entry_hash) return { valid: false, broken_at: i };
    prev = e.entry_hash;
  }
  return { valid: true, broken_at: null };
}

/* ------------------------------------------------------------------ */
/*  Fixture ledger — the demo learner's event history                  */
/* ------------------------------------------------------------------ */

export const MOCK_DEMO_USER_ID = "4c1e0a9f-8c6e-4b2d-9f3a-2b8d1e5c7a91";
export const MOCK_DEMO_USER_NAME = "Aarav Mehta";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const iso = (daysAgo: number, hourOffset = 0) =>
  new Date(now - daysAgo * DAY + hourOffset * 3_600_000).toISOString();

/** [daysAgo, xp_type, xp_delta, reason_code, multiplier, integrity?] */
type LedgerSeed = [number, LedgerEntry["xp_type"], number, string, number, IntegrityStatus?];

/** About 10 weeks of realistic activity for a mid-ranked learner. */
const DEMO_LEDGER_SEED: LedgerSeed[] = [
  [68, "completion", 400, "COURSE_COMPLETE", 1],
  [66, "mastery", 220, "MAIN_ASSESSMENT", 1],
  // Reversed entry — the original MAIN_ASSESSMENT award was admin-reviewed
  // and offset (never deleted): this backs the revoked First Blood badge (§7.3).
  [65, "adjustment", -220, "INTEGRITY_REVERSAL", 1, "reversed"],
  [64, "completion", 400, "COURSE_COMPLETE", 1],
  [63, "mastery", 310, "SIDE_ASSESSMENT_MULTIPLIER", 1.35],
  [60, "completion", 400, "COURSE_COMPLETE", 1],
  [58, "mastery", 180, "MAIN_ASSESSMENT", 1],
  [55, "completion", 250, "COURSE_MODULE", 1],
  [52, "mastery", 420, "SIDE_ASSESSMENT_MULTIPLIER", 1.5],
  [49, "completion", 400, "COURSE_COMPLETE", 1],
  [47, "mastery", 240, "MAIN_ASSESSMENT", 1],
  [45, "completion", 250, "COURSE_MODULE", 1],
  [43, "mastery", 500, "SIDE_ASSESSMENT_MULTIPLIER", 1.8],
  [40, "completion", 400, "COURSE_COMPLETE", 1],
  [38, "mastery", 280, "MAIN_ASSESSMENT", 1],
  [35, "completion", 400, "COURSE_COMPLETE", 1],
  [33, "mastery", 350, "SIDE_ASSESSMENT_MULTIPLIER", 1.45],
  [30, "completion", 250, "COURSE_MODULE", 1],
  [28, "mastery", 320, "MAIN_ASSESSMENT", 1],
  [25, "completion", 400, "COURSE_COMPLETE", 1],
  [23, "mastery", 460, "SIDE_ASSESSMENT_MULTIPLIER", 1.65],
  [20, "completion", 400, "COURSE_COMPLETE", 1],
  [18, "mastery", 300, "MAIN_ASSESSMENT", 1],
  [15, "completion", 250, "COURSE_MODULE", 1],
  [13, "mastery", 380, "SIDE_ASSESSMENT_MULTIPLIER", 1.4],
  [10, "completion", 400, "COURSE_COMPLETE", 1],
  [8, "mastery", 340, "MAIN_ASSESSMENT", 1],
  [6, "completion", 250, "COURSE_MODULE", 1],
  [4, "mastery", 520, "SIDE_ASSESSMENT_MULTIPLIER", 1.9],
  [2, "completion", 400, "COURSE_COMPLETE", 1],
  [0, "mastery", 210, "MAIN_ASSESSMENT", 1],
];

async function buildLedger(userId: string, seed: LedgerSeed[]): Promise<LedgerEntry[]> {
  let prev = GENESIS_HASH;
  const entries: LedgerEntry[] = [];
  for (const [daysAgo, xp_type, xp_delta, reason_code, multiplier, integrity] of seed) {
    const created_at = iso(daysAgo);
    const entry: LedgerEntry = {
      id: uuid(),
      user_id: userId,
      event_id: uuid(),
      xp_type,
      xp_delta,
      reason_code,
      multiplier_applied: multiplier,
      prev_hash: prev,
      entry_hash: await computeEntryHash(
        prev,
        userId,
        xp_delta,
        reason_code,
        created_at,
      ),
      created_at,
      integrity_status: integrity ?? "verified",
    };
    entries.push(entry);
    prev = entry.entry_hash;
  }
  return entries;
}

let demoLedgerPromise: Promise<LedgerEntry[]> | null = null;
function demoLedger(): Promise<LedgerEntry[]> {
  if (!demoLedgerPromise) {
    demoLedgerPromise = buildLedger(MOCK_DEMO_USER_ID, DEMO_LEDGER_SEED);
  }
  return demoLedgerPromise;
}

/**
 * Chain integrity self-check (§7.2): a broken link is a P0, never a warning.
 * Exported so logic tests can assert the mock chain is always valid and that
 * tampering is detectable.
 */
export async function verifyDemoLedger(): Promise<{
  valid: boolean;
  broken_at: number | null;
}> {
  return verifyLedgerChain(await demoLedger());
}

/** Raw ledger read for the audit viewer (append-only, nothing mutated). */
export async function demoLedgerEntries(): Promise<LedgerEntry[]> {
  return demoLedger();
}

/* ------------------------------------------------------------------ */
/*  Audit → ledger wiring + reconciliation (F7 Task 3)                 */
/* ------------------------------------------------------------------ */

/**
 * Resolve the seeded audit rows' ledger links against the REAL chained demo
 * ledger. The ledger builds with random ids, so links are resolved at read
 * time — the audit fixtures always point at actual entries (a verified
 * COURSE_COMPLETE grant, and the reversal that offset a MAIN_ASSESSMENT
 * award), never hardcoded ids.
 */
export async function auditLedgerLinkFor(
  marker: "grant" | "reversal",
): Promise<LedgerEntry> {
  const ledger = await demoLedger();
  if (marker === "grant") {
    const grant = ledger.find(
      (e) =>
        e.reason_code === "COURSE_COMPLETE" &&
        e.integrity_status === "verified",
    );
    if (grant) return grant;
    throw new Error(
      "Mock invariant: no verified COURSE_COMPLETE grant in the demo ledger.",
    );
  }
  const reversal = ledger.find((e) => e.integrity_status === "reversed");
  if (reversal) return reversal;
  throw new Error("Mock invariant: no reversed entry in the demo ledger.");
}

/** Addressable ledger read — the backing store for getLedgerEntry(). */
export async function findLedgerEntryById(
  id: string,
): Promise<LedgerEntry | undefined> {
  const ledger = await demoLedger();
  return ledger.find((e) => e.id === id);
}

/**
 * Running-balance projection over the chain — the engine would serve this;
 * the client never recomputes (build.md §3). balance_after for an entry is
 * the sum of deltas up to and including it; balance_before excludes it.
 */
export async function ledgerDetailFor(
  entry: LedgerEntry,
): Promise<LedgerEntryDetail> {
  const ledger = await demoLedger();
  const index = ledger.findIndex((e) => e.id === entry.id);
  let before = 0;
  if (index !== -1) {
    for (let i = 0; i < index; i++) before += ledger[i]!.xp_delta;
  }
  return {
    ...entry,
    balance_before: before,
    balance_after: before + entry.xp_delta,
  };
}

/** Server-side reconciliation verdict (Task 3) — never client math. */
export interface LedgerReconciliationFixture {
  user_id: string;
  display_name: string;
  /** What the cached ProgressContext reports as the user's total balance. */
  cached_total_xp: number;
  /** What the append-only ledger actually sums to. */
  ledger_sum: number;
  entry_count: number;
}

/** Ravi Kapoor — ledger sums to 950 while his cached context claims 1000. */
const DRIFT_USER_ID = "9f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81";
const DRIFT_USER_NAME = "Ravi Kapoor";
const DRIFT_LEDGER_SEED: LedgerSeed[] = [
  [42, "completion", 400, "COURSE_COMPLETE", 1],
  [40, "mastery", 300, "MAIN_ASSESSMENT", 1],
  [38, "completion", 250, "COURSE_MODULE", 1],
];
const DRIFT_CACHED_TOTAL_XP = 1000;

/**
 * The users the reconciliation panel can audit. The demo learner's cached
 * balance is derived from the SAME ledger the context is computed from
 * (aggregate tracks + adjustments), so it reconciles cleanly — while Ravi's
 * fixture has deliberate drift so the mismatch flag is demonstrable.
 */
export async function reconciliationFixtures(): Promise<
  Map<string, LedgerReconciliationFixture>
> {
  const map = new Map<string, LedgerReconciliationFixture>();

  const ledger = await demoLedger();
  const ledgerSum = ledger.reduce((sum, e) => sum + e.xp_delta, 0);
  // ProgressContext has no total-balance field, so the engine's cached
  // balance is the raw ledger total — a consistent engine reconciles by
  // construction (this is the clean demo); Ravi's fixture below is the
  // deliberate-drift case.
  map.set(MOCK_DEMO_USER_ID, {
    user_id: MOCK_DEMO_USER_ID,
    display_name: MOCK_DEMO_USER_NAME,
    cached_total_xp: ledgerSum,
    ledger_sum: ledgerSum,
    entry_count: ledger.length,
  });

  map.set(DRIFT_USER_ID, {
    user_id: DRIFT_USER_ID,
    display_name: DRIFT_USER_NAME,
    cached_total_xp: DRIFT_CACHED_TOTAL_XP,
    ledger_sum: DRIFT_LEDGER_SEED.reduce((sum, [, , delta]) => sum + delta, 0),
    entry_count: DRIFT_LEDGER_SEED.length,
  });

  return map;
}

/**
 * §5.4 step 7 — versioned recomputes. Each context_version is computed from
 * an earlier slice of the same append-only ledger (like a nightly recompute),
 * so diffs between versions are honest deltas over real entries. The
 * genesis-anchor chain status and the reverse-chronological snapshots let the
 * viewer answer "show me exactly why user X is Rank 7".
 */
export async function buildLedgerAudit(): Promise<{
  chain: { valid: boolean; broken_at: number | null; genesis_hash: string };
  snapshots: {
    context_version: number;
    computed_at: string;
    rank_name: string;
    level: number;
    completion_xp: number;
    mastery_xp: number;
    current_streak_days: number;
    freeze_status: FreezeStatus;
  }[];
}> {
  const ledger = await demoLedger();
  const chain = await verifyLedgerChain(ledger);
  // Recompute from progressively older slices: v43 (2 weeks ago), v42 (1 week
  // ago), v41 (now). Slices keep the reversed-adjustment entry in every case
  // so the reversal stays visible in the audit trail.
  const slices: [number, number][] = [
    [43, Math.floor(ledger.length * 0.62)],
    [42, Math.floor(ledger.length * 0.8)],
    [41, ledger.length],
  ];
  const snapshots = [];
  for (const [version, count] of slices) {
    const { completion_xp, mastery_xp } = aggregateXpTracks(
      ledger.slice(0, count),
    );
    const { level, rank_name } = resolveRank(completion_xp, mastery_xp);
    const computedDaysAgo = version === 41 ? 0 : version === 42 ? 7 : 14;
    snapshots.push({
      context_version: version,
      computed_at: iso(computedDaysAgo),
      rank_name,
      level,
      completion_xp,
      mastery_xp,
      current_streak_days: version === 41 ? 21 : version === 42 ? 14 : 7,
      freeze_status: "live" as FreezeStatus,
    });
  }
  return { chain: { ...chain, genesis_hash: GENESIS_HASH }, snapshots };
}

/* ------------------------------------------------------------------ */
/*  §5.4 step 2 — XP aggregation per track (never blended)             */
/* ------------------------------------------------------------------ */

export function aggregateXpTracks(ledger: LedgerEntry[]): {
  completion_xp: number;
  mastery_xp: number;
  bonus_xp: number;
} {
  let completion_xp = 0;
  let mastery_xp = 0;
  let bonus_xp = 0;
  for (const e of ledger) {
    // §7.4: a reversal writes a compensating `adjustment` entry — the original
    // is never deleted, only OFFSET. So adjustments (negative deltas) are
    // applied to the mastery track here, netting the reversed award to zero.
    // integrity_status on an adjustment is audit metadata, not a skip signal.
    const delta = Math.round(e.xp_delta * e.multiplier_applied);
    if (e.xp_type === "completion") completion_xp += delta;
    else if (e.xp_type === "mastery") mastery_xp += delta;
    else if (e.xp_type === "bonus") bonus_xp += delta;
    else if (e.xp_type === "adjustment") mastery_xp += delta; // compensating offset
  }
  return { completion_xp, mastery_xp, bonus_xp };
}

/* ------------------------------------------------------------------ */
/*  §5.4 step 3 — rank resolution (weights live in rules.py; mock)     */
/* ------------------------------------------------------------------ */

/**
 * Weighted rank function (mock): 60% mastery-weight + 40% completion-weight.
 * The doc says weights live in rules.py — flagged provisional in the register.
 * Maps to the §5.2 bands by equivalent XP.
 */
export function resolveRank(
  completion_xp: number,
  mastery_xp: number,
): { level: number; rank_name: string; equivalent_xp: number } {
  const equivalent_xp = Math.round(mastery_xp * 0.6 + completion_xp * 0.4);
  const level = RANK_LADDER.find(
    (r) => equivalent_xp >= r.min_xp && (r.max_xp === null || equivalent_xp < r.max_xp),
  ) ?? RANK_LADDER[RANK_LADDER.length - 1]!;
  return { level: level.level, rank_name: level.rank_name, equivalent_xp };
}

/* ------------------------------------------------------------------ */
/*  §5.4 step 4 — streak resolution                                    */
/* ------------------------------------------------------------------ */

/** 1.0 -> 2.0x, derived from current_streak_days (§5.3). Mock: +0.05/day, cap 2.0. */
export function momentumFor(streakDays: number): number {
  return Math.min(2.0, 1 + streakDays * 0.05);
}

export function resolveStreak(
  userId: string,
  lastActiveDaysAgo: number,
  longest: number,
  freezeTokens: number,
  dateStr: string,
): StreakState {
  const current = Math.max(0, longest - lastActiveDaysAgo);
  const gracePeriod = lastActiveDaysAgo === 1 && freezeTokens > 0;
  const broken = lastActiveDaysAgo > 1 && freezeTokens === 0;
  return {
    user_id: userId,
    current_streak_days: current,
    longest_streak_days: longest,
    freeze_tokens_available: gracePeriod ? freezeTokens - 1 : freezeTokens,
    momentum_multiplier: momentumFor(current),
    last_active_date: dateStr,
    status: broken ? "broken" : gracePeriod ? "grace_period" : "active",
  };
}

/* ------------------------------------------------------------------ */
/*  The assembled demo ProgressContext (§5.4 step 7)                   */
/* ------------------------------------------------------------------ */

const DEMO_LEAGUE: LeagueStanding = {
  user_id: MOCK_DEMO_USER_ID,
  season_id: "a3f1c2e8-9b0d-4f6a-8e2c-1d5b7a9f3c21",
  league_tier: "gold",
  rank_in_league: 42,
  xp_this_season: 4710,
  promotion_zone: true,
  relegation_zone: false,
};

const DEMO_GUILD_ROLLUP = {
  guild_id: "c7a4b8f1-2d5e-4a9c-8b3f-6e1d2c4a5b78",
  member_count: 24,
  combined_xp_this_week: 48120,
  guild_rank_global: 17,
};

async function computeDemoContext(): Promise<ProgressContext> {
  const { completion_xp, mastery_xp } = aggregateXpTracks(await demoLedger());
  const { level, rank_name } = resolveRank(completion_xp, mastery_xp);
  const streak = resolveStreak(
    MOCK_DEMO_USER_ID,
    0,
    21,
    2,
    new Date(now).toISOString().slice(0, 10),
  );
  return {
    context_version: 41,
    user_id: MOCK_DEMO_USER_ID,
    computed_at: new Date(now).toISOString(),
    rank: {
      user_id: MOCK_DEMO_USER_ID,
      level,
      rank_name,
      prestige_tier: 0,
      completion_xp,
      mastery_xp,
      percentile_global: 87.4,
      percentile_cohort: 92.1,
      specialization_tag: "Networking & Security",
    },
    streak,
    league: DEMO_LEAGUE,
    guild: DEMO_GUILD_ROLLUP,
    unresolved_flags: [],
    freeze_status: "live",
  };
}

/** Frozen edge case: same ledger, but one flagged entry froze public display. */
async function computeFrozenContext(): Promise<ProgressContext> {
  const ctx = await computeDemoContext();
  return {
    ...ctx,
    context_version: 44,
    unresolved_flags: ["integrity_review_pending"],
    freeze_status: "frozen_pending_review",
  };
}

let contextsPromise: Promise<Map<string, ProgressContext>> | null = null;
async function contexts(): Promise<Map<string, ProgressContext>> {
  if (!contextsPromise) {
    contextsPromise = (async () => {
      const map = new Map<string, ProgressContext>();
      map.set(MOCK_DEMO_USER_ID, await computeDemoContext());
      map.set("frozen-demo", await computeFrozenContext());
      return map;
    })();
  }
  return contextsPromise;
}

export async function contextForUser(userId: string): Promise<ProgressContext | null> {
  return (await contexts()).get(userId) ?? null;
}

/* ------------------------------------------------------------------ */
/*  Projections — all read-only over the same derived numbers          */
/* ------------------------------------------------------------------ */

/** Deterministic pseudo-standings for the ZRANGE-shaped leaderboards. */
const RIVAL_NAMES = [
  "Zara Khan", "Liam O'Connor", "Maya Chen", "Rohan Das", "Nina Petrova",
  "Diego Álvarez", "Sofia Rossi", "Kenji Tanaka", "Amara Okafor", "Felix Weber",
  "Priya Nair", "Leo Martins", "Ingrid Larsen", "Omar Haddad", "Yuki Sato",
  "Elena Volkov", "Marcus Reid", "Aisha Bello", "Tomás Silva", "Hana Kim",
  "Viktor Novak", "Chloe Dubois", "Ahmed Al-Farsi", "Grace Lim", "Peter Nagy",
  "Isabella Costa", "Noah Berg", "Fatima Zahra", "Jack Wilson", "Lena Fischer",
];

function pseudoScore(i: number): number {
  // Deterministic decreasing scores with a believable spread.
  return Math.max(0, Math.round(38_400 - i * 940 + ((i * 137) % 420)));
}

function pseudoLevel(score: number): { level: number; rank_name: string } {
  const level = RANK_LADDER.find(
    (r) => score >= r.min_xp && (r.max_xp === null || score < r.max_xp),
  ) ?? RANK_LADDER[RANK_LADDER.length - 1]!;
  return { level: level.level, rank_name: level.rank_name };
}

export function buildLeaderboard(
  scope: LeaderboardScope,
  offset: number,
  me: { user_id: string; display_name: string; score: number } | null,
): LeaderboardPage {
  const total = scope === "global" ? 128 : 24;
  const pageSize = 10;
  const start = offset;

  // Build the full deterministic board, insert the user at their TRUE rank
  // (a ZRANGE projection — how many rivals outscore them), then slice the
  // page. Ranks are recomputed after insertion so the board stays sorted.
  const all: { user_id: string; display_name: string; score: number }[] = [];
  for (let i = 0; i < total; i++) {
    all.push({
      user_id: `rival-${i}`,
      display_name: RIVAL_NAMES[i % RIVAL_NAMES.length]!,
      score: pseudoScore(i),
    });
  }
  if (me) {
    const insertAt = all.findIndex((r) => r.score < me.score);
    all.splice(insertAt === -1 ? all.length : insertAt, 0, {
      user_id: me.user_id,
      display_name: me.display_name,
      score: me.score,
    });
  }

  const slice = all.slice(start, start + pageSize);
  const rows: LeaderboardEntry[] = slice.map((entry, i) => {
    const rank = start + i + 1;
    const isMe = me !== null && entry.user_id === me.user_id;
    const { level, rank_name } = pseudoLevel(entry.score);
    return {
      rank,
      user_id: entry.user_id,
      display_name: entry.display_name,
      avatar_url: null,
      score: entry.score,
      level,
      rank_name,
      prestige_tier: isMe ? 0 : rank === 1 ? 3 : rank < 5 ? 1 : 0,
      is_me: isMe,
      guild_id: scope === "guild" ? DEMO_GUILD_ROLLUP.guild_id : undefined,
    };
  });

  return { scope, offset: start, total, entries: rows, has_more: start + pageSize < total };
}

/**
 * The user's own standing on a board — the ZRANK-shaped read pinned at the
 * top of the UI so the demo user is visible even when their true rank is
 * off the first page. Same derived source as buildLeaderboard.
 */
export function buildMyStanding(
  scope: LeaderboardScope,
  me: { user_id: string; display_name: string; score: number },
): LeaderboardEntry | null {
  const total = scope === "global" ? 128 : 24;
  let rank = 1;
  for (let i = 0; i < total; i++) {
    if (pseudoScore(i) > me.score) rank++;
  }
  const { level, rank_name } = pseudoLevel(me.score);
  return {
    rank,
    user_id: me.user_id,
    display_name: me.display_name,
    avatar_url: null,
    score: me.score,
    level,
    rank_name,
    prestige_tier: 0,
    is_me: true,
    guild_id: scope === "guild" ? DEMO_GUILD_ROLLUP.guild_id : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Guild board + guild-vs-guild                                       */
/* ------------------------------------------------------------------ */

const GUILD_MEMBER_NAMES = [
  "Aarav Mehta", "Zara Khan", "Kenji Tanaka", "Sofia Rossi", "Omar Haddad",
  "Grace Lim", "Noah Berg", "Lena Fischer",
];

export function buildGuildBoard(): GuildStanding {
  const baseXp = DEMO_GUILD_ROLLUP.combined_xp_this_week;
  // Weights sum to 1 so the displayed member rows reconcile exactly to the
  // rollup's combined_xp_this_week (a reviewer with the ledger open can
  // add the rows up).
  const weights = [0.2, 0.16, 0.14, 0.12, 0.1, 0.1, 0.09, 0.09];
  const members: GuildMember[] = GUILD_MEMBER_NAMES.map((name, i) => {
    const isMe = i === 0;
    const xp = Math.round(baseXp * weights[i]!);
    const { level, rank_name } = pseudoLevel(xp * 5);
    return {
      user_id: isMe ? MOCK_DEMO_USER_ID : `guild-${i}`,
      display_name: name,
      avatar_url: null,
      xp_this_week: xp,
      level,
      rank_name,
      joined_at: new Date(now - i * 31 * DAY).toISOString(),
      is_me: isMe,
    };
  });
  return {
    guild_id: DEMO_GUILD_ROLLUP.guild_id,
    name: "Packet Protectors",
    members,
    member_count: DEMO_GUILD_ROLLUP.member_count,
    combined_xp_this_week: baseXp,
    guild_rank_global: DEMO_GUILD_ROLLUP.guild_rank_global,
  };
}

export function buildGuildVsGuild(): GuildVsGuild {
  const ours = { guild_id: DEMO_GUILD_ROLLUP.guild_id, name: "Packet Protectors", combined_xp_this_week: DEMO_GUILD_ROLLUP.combined_xp_this_week };
  const rivals = [
    { guild_id: "g-1", name: "Zero Day Zephyrs", combined_xp_this_week: 52_480 },
    { guild_id: "g-2", name: "Binary Banshees", combined_xp_this_week: 44_120 },
    { guild_id: "g-3", name: "Shell Shockers", combined_xp_this_week: 38_940 },
  ];
  return {
    ours,
    rivals: rivals.map((r) => ({ ...r, delta_xp: r.combined_xp_this_week - ours.combined_xp_this_week })),
  };
}

/* ------------------------------------------------------------------ */
/*  Badges — verified / flagged / revoked all present (§7.3)           */
/* ------------------------------------------------------------------ */

export const MOCK_BADGES: Badge[] = [
  {
    badge_id: "bdg-netsec-01",
    name: "Network Guardian",
    description: "Completed the Networking & Security mastery track with a 90%+ assessment average.",
    credential_id: "b-verified-7f3a",
    verify_url: "/rank/verify/b-verified-7f3a",
    earned_at: iso(34, 5),
    status: "verified",
    category: "Networking & Security",
  },
  {
    badge_id: "bdg-bash-02",
    name: "Terminal Whisperer",
    description: "Completed all Linux labs in under the default time budget.",
    credential_id: "b-flagged-2c9e",
    verify_url: "/rank/verify/b-flagged-2c9e",
    earned_at: iso(12, 8),
    status: "flagged",
    category: "Systems",
  },
  {
    badge_id: "bdg-rev-03",
    name: "First Blood",
    description: "First correct submission on a new judge problem.",
    credential_id: "b-revoked-8d11",
    verify_url: "/rank/verify/b-revoked-8d11",
    earned_at: iso(70, 2),
    status: "revoked",
    category: "Algorithms",
  },
  {
    badge_id: "bdg-writer-04",
    name: "Ops Chronicle",
    description: "Wrote 5 documented incident post-mortems in the cohort journal.",
    credential_id: "b-verified-1be4",
    verify_url: "/rank/verify/b-verified-1be4",
    earned_at: iso(5, 1),
    status: "verified",
    category: "Operations",
  },
];

export function verifyCredential(credentialId: string): BadgeVerifyResult | null {
  const badge = MOCK_BADGES.find((b) => b.credential_id === credentialId);
  if (!badge) return null;
  const notes: Record<Badge["status"], string> = {
    verified:
      "Signature valid — the ledger entries backing this badge are intact (hash chain verified).",
    flagged:
      "Pending integrity review — this credential's underlying ledger entries were flagged. Public display is frozen until review clears.",
    revoked:
      "Revoked — the underlying ledger entries were reversed (admin-reviewed adjustment). This credential no longer certifies anything.",
  };
  return {
    credential_id: badge.credential_id,
    badge_name: badge.name,
    issuer: "Zapsters",
    subject: { user_id: MOCK_DEMO_USER_ID, display_name: MOCK_DEMO_USER_NAME },
    claim: {
      category: badge.category,
      earned_at: badge.earned_at,
      level: 7,
      rank_name: "Olympian",
    },
    signature:
      "ed25519:0x9f2c4d8a1b6e3f7c5a0d2b4e8c1f3a6b9d4e7c2f8a1b3d5c7e9f0a2b4d6c8e1",
    status: badge.status,
    note: notes[badge.status]!,
  };
}

/* ------------------------------------------------------------------ */
/*  Skill tree — category-level XP projection                          */
/* ------------------------------------------------------------------ */

export const MOCK_SKILL_TREE: SkillTreeNode[] = [
  {
    category: "Networking & Security",
    completion_xp: 4_180,
    mastery_xp: 3_240,
    progress: 0.92,
    children: [
      { name: "Network Fundamentals", progress: 1, completion_xp: 1_100 },
      { name: "Defensive Security", progress: 0.88, completion_xp: 1_640 },
      { name: "Offensive Tooling", progress: 0.74, completion_xp: 1_440 },
    ],
  },
  {
    category: "Systems & Linux",
    completion_xp: 3_560,
    mastery_xp: 2_480,
    progress: 0.81,
    children: [
      { name: "Linux CLI", progress: 1, completion_xp: 1_280 },
      { name: "Bash Scripting", progress: 0.76, completion_xp: 1_120 },
      { name: "Containerization", progress: 0.55, completion_xp: 1_160 },
    ],
  },
  {
    category: "Algorithms",
    completion_xp: 2_940,
    mastery_xp: 3_020,
    progress: 0.68,
    children: [
      { name: "Data Structures", progress: 0.8, completion_xp: 1_160 },
      { name: "Search & Sort", progress: 0.72, completion_xp: 1_020 },
      { name: "Graph Theory", progress: 0.46, completion_xp: 760 },
    ],
  },
  {
    category: "Operations",
    completion_xp: 1_420,
    mastery_xp: 940,
    progress: 0.41,
    children: [
      { name: "Incident Response", progress: 0.52, completion_xp: 620 },
      { name: "Monitoring", progress: 0.38, completion_xp: 420 },
      { name: "SRE Practices", progress: 0.3, completion_xp: 380 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Share card + season pass                                           */
/* ------------------------------------------------------------------ */

export async function buildShareCard(): Promise<ShareCardData> {
  const ctx = await computeDemoContext();
  const hash = await sha256Hex(
    `${ctx.user_id}|${ctx.rank.rank_name}|${ctx.rank.level}|${ctx.computed_at}`,
  );
  return {
    user_id: ctx.user_id,
    display_name: MOCK_DEMO_USER_NAME,
    rank_name: ctx.rank.rank_name,
    level: ctx.rank.level,
    prestige_tier: ctx.rank.prestige_tier,
    completion_xp: ctx.rank.completion_xp,
    mastery_xp: ctx.rank.mastery_xp,
    current_streak_days: ctx.streak.current_streak_days,
    league_tier: ctx.league?.league_tier ?? null,
    credential_id: "b-verified-7f3a",
    card_hash: hash.slice(0, 24),
  };
}

export function buildSeasonPass(): SeasonPassState {
  const xp = DEMO_LEAGUE.xp_this_season;
  const milestoneDefs = [
    { milestone: 1, required: 1_000, reward: "Streak Freeze Token", premium: false },
    { milestone: 2, required: 2_500, reward: "Aura: Ember (bronze)", premium: true },
    { milestone: 3, required: 4_500, reward: "League promo push", premium: false },
    { milestone: 4, required: 7_000, reward: "Aura: Solar Flare", premium: true },
    { milestone: 5, required: 10_000, reward: "Season badge", premium: false },
  ];
  return {
    season_id: DEMO_LEAGUE.season_id,
    season_name: "Season 3 — Null Pointer",
    xp_this_season: xp,
    premium_owned: true,
    milestones: milestoneDefs.map((m) => ({
      milestone: m.milestone,
      required_season_xp: m.required,
      reward: m.reward,
      premium: m.premium,
      progress: Math.min(1, xp / m.required),
    })),
  };
}
