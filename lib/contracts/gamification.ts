/**
 * Gamification Engine contracts (gamification doc §5.2, §5.3 — source of
 * truth). The Pydantic schemas in §5.3 are transcribed field-for-field,
 * including names, types, and literals — do not paraphrase or simplify.
 *
 * Locked by the docs:
 *  - LedgerEntry, StreakState, RankState, LeagueStanding, GuildRollup,
 *    ProgressContext — §5.3 verbatim (see comments per field).
 *  - Rank ladder §5.2: Initiate → Deus, 10 levels + Prestige tiers; the XP
 *    bands are ILLUSTRATIVE in the doc ("real thresholds live in rules.py"),
 *    so they are mock constants here, flagged provisional.
 *  - Dual XP: completion_xp and mastery_xp are two independent tracks, never
 *    blended (§5.2). Displayed rank is a WEIGHTED function of both (weights
 *    in rules.py — mock weights are a documented assumption).
 *  - integrity_status literals: verified | flagged | reversed (§5.3).
 *  - league_tier literals: bronze | silver | gold | platinum | obsidian.
 *  - freeze_status literals: live | frozen_pending_review.
 *  - streak status literals: active | grace_period | broken | frozen.
 *  - The one architectural law: Rank/XP/leaderboard position are DERIVED
 *    by the demo service from an append-only ledger; the client only previews.
 *
 * NOT locked by the docs (reasonable decisions, logged in index.ts):
 *  - Projection shapes below §5.3: LeaderboardEntry (ZRANGE-shaped),
 *    GuildMember, GuildStanding, Badge/VerifyResult, SkillTreeNode,
 *    SeasonPass/Milestone, ShareCardData — the projections are named in §5.5
 *    but not schematized.
 *  - RANK_LADDER constants (the doc's §5.2 table is illustrative).
 */

/* ------------------------------------------------------------------ */
/*  §5.3 — the frozen ProgressContext schema (verbatim)               */
/* ------------------------------------------------------------------ */

export type XpType = "completion" | "mastery" | "bonus" | "adjustment";

export type IntegrityStatus = "verified" | "flagged" | "reversed";

export type StreakStatus = "active" | "grace_period" | "broken" | "frozen";

export type LeagueTier = "bronze" | "silver" | "gold" | "platinum" | "obsidian";

export type FreezeStatus = "live" | "frozen_pending_review";

/** §5.3 LedgerEntry — one append-only row of the xp_ledger. */
export interface LedgerEntry {
  id: string; // UUID
  user_id: string; // UUID
  /** Traces back to the originating event, always. */
  event_id: string; // UUID
  xp_type: XpType;
  /** Can be negative only for "adjustment" (admin-reviewed correction). */
  xp_delta: number;
  /** e.g. "COURSE_COMPLETE", "SIDE_ASSESSMENT_MULTIPLIER". */
  reason_code: string;
  multiplier_applied: number;
  /** hash-chain — see §7.2 */
  prev_hash: string;
  entry_hash: string;
  created_at: string; // datetime
  integrity_status: IntegrityStatus;
}

/** §5.3 StreakState. */
export interface StreakState {
  user_id: string; // UUID
  current_streak_days: number;
  longest_streak_days: number;
  freeze_tokens_available: number;
  /** 1.0 -> 2.0x, derived from current_streak_days. */
  momentum_multiplier: number;
  last_active_date: string; // date
  status: StreakStatus;
}

/** §5.3 RankState. */
export interface RankState {
  user_id: string; // UUID
  /** 1-10 */
  level: number;
  rank_name: string;
  /** 0 = no prestige yet */
  prestige_tier: number;
  completion_xp: number;
  mastery_xp: number;
  /** Server-derived progress through the current rank band, 0-100. */
  rank_progress_pct: number;
  percentile_global: number;
  /** within org/guild, if applicable */
  percentile_cohort: number | null;
  /** auto-computed from category XP distribution */
  specialization_tag: string | null;
}

/** §5.3 LeagueStanding. */
export interface LeagueStanding {
  user_id: string; // UUID
  season_id: string; // UUID
  league_tier: LeagueTier;
  rank_in_league: number;
  xp_this_season: number;
  promotion_zone: boolean;
  relegation_zone: boolean;
}

/** Slice 09 — one season's public metadata (GET /seasons/current). */
export interface SeasonSummary {
  id: string; // UUID
  name: string;
  status: "active" | "scheduled" | "none" | "completed";
  start_at: string;
  end_at: string;
}

/** Slice 09 — one row of the caller's tier board (league leaderboard). */
export interface LeagueBoardEntry {
  rank: number;
  user_id: string; // UUID
  display_name: string;
  avatar_url: string | null;
  xp_this_season: number;
  is_me: boolean;
}

/** Slice 09 — the caller's tier board read model. */
export interface LeagueBoard {
  season_id: string; // UUID
  tier: LeagueTier;
  offset: number;
  total: number;
  entries: LeagueBoardEntry[];
  has_more: boolean;
}

/** §5.3 GuildRollup. */
export interface GuildRollup {
  guild_id: string; // UUID
  member_count: number;
  combined_xp_this_week: number;
  guild_rank_global: number;
}

/**
 * §5.3 ProgressContext — the ONE frozen object every projection reads.
 * Nothing downstream re-derives a rank, streak, league, or guild standing.
 */
export interface ProgressContext {
  /** increments on every recompute, never mutated in place */
  context_version: number;
  user_id: string; // UUID
  computed_at: string; // datetime
  rank: RankState;
  streak: StreakState;
  league: LeagueStanding | null;
  guild: GuildRollup | null;
  /** e.g. "integrity_review_pending" — freeze blocks public display, not XP accrual */
  unresolved_flags: string[];
  freeze_status: FreezeStatus;
}

/* ------------------------------------------------------------------ */
/*  §5.2 — the rank ladder (mock constants; doc table is illustrative) */
/* ------------------------------------------------------------------ */

export interface RankLevel {
  level: number;
  rank_name: string;
  /** min completion-equivalent XP for this level (illustrative) */
  min_xp: number;
  /** max XP (exclusive upper bound for levels 1–9; null = top level) */
  max_xp: number | null;
  tagline: string;
}

/**
 * §5.2 ladder, verbatim names + bands. The doc says real thresholds live in
 * rules.py and these are illustrative — flagged provisional in the register.
 */
export const RANK_LADDER: RankLevel[] = [
  { level: 1, rank_name: "Initiate", min_xp: 0, max_xp: 500, tagline: "Every legend starts at zero." },
  { level: 2, rank_name: "Oracle", min_xp: 500, max_xp: 1200, tagline: "The path becomes visible." },
  { level: 3, rank_name: "Spartan", min_xp: 1200, max_xp: 2500, tagline: "Discipline over inspiration." },
  { level: 4, rank_name: "Titan", min_xp: 2500, max_xp: 4500, tagline: "The weight of the climb." },
  { level: 5, rank_name: "Atlas", min_xp: 4500, max_xp: 7500, tagline: "You carry the map now." },
  { level: 6, rank_name: "Hyperion", min_xp: 7500, max_xp: 12000, tagline: "Light ahead, always." },
  { level: 7, rank_name: "Olympian", min_xp: 12000, max_xp: 18000, tagline: "Among the few who remain." },
  { level: 8, rank_name: "Primordial", min_xp: 18000, max_xp: 26000, tagline: "Older than the questions." },
  { level: 9, rank_name: "Ascendant", min_xp: 26000, max_xp: 36000, tagline: "Reality bends to will." },
  { level: 10, rank_name: "Deus", min_xp: 36000, max_xp: null, tagline: "The ceiling is a floor." },
];

/* ------------------------------------------------------------------ */
/*  Projections (named in §5.5, not schematized — reasonable shapes)   */
/* ------------------------------------------------------------------ */

/** One leaderboard row — shaped like a Redis ZRANGE read (rank, id, score). */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  /** Leaderboard score — completion + mastery, weighted by the demo service. */
  score: number;
  level: number;
  rank_name: string;
  prestige_tier: number;
  /** Highlighted only for the requesting user. */
  is_me: boolean;
  /** Present on the guild board only. */
  guild_id?: string;
}

export type LeaderboardScope = "global" | "guild";

export interface LeaderboardPage {
  scope: LeaderboardScope;
  /** ZRANGE-style cursor pagination. */
  offset: number;
  total: number;
  entries: LeaderboardEntry[];
  has_more: boolean;
}

export interface GuildMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  xp_this_week: number;
  level: number;
  rank_name: string;
  joined_at: string;
  is_me: boolean;
}

export interface GuildStanding {
  guild_id: string;
  name: string;
  members: GuildMember[];
  /** GuildRollup fields, denormalized for the board header. */
  member_count: number;
  combined_xp_this_week: number;
  guild_rank_global: number;
}

export interface GuildVsGuild {
  /** The requesting user's guild. */
  ours: { guild_id: string; name: string; combined_xp_this_week: number };
  /** Top competing guilds this week. */
  rivals: {
    guild_id: string;
    name: string;
    combined_xp_this_week: number;
    /** XP gap relative to `ours` (negative = ahead of us). */
    delta_xp: number;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Badges & verifiable credentials (§7.3)                            */
/* ------------------------------------------------------------------ */

export type BadgeStatus = "verified" | "flagged" | "revoked";

export interface Badge {
  badge_id: string;
  name: string;
  description: string;
  /** Open Badges v3-shaped demo claim. */
  credential_id: string;
  /** Public, permanent verify URL (zapsters.com/verify/{credential_id}). */
  verify_url: string;
  earned_at: string;
  /** Current truth at the stable URL — never a stale-but-trusted artifact. */
  status: BadgeStatus;
  /** Category this badge certifies (links to the skill tree). */
  category: string;
}

/** The mock verify page payload — mirrors the independent re-verification. */
export interface BadgeVerifyResult {
  credential_id: string;
  badge_name: string;
  issuer: string; // "Zapsters"
  subject: { user_id: string; display_name: string };
  claim: { category: string; earned_at: string; level: number; rank_name: string };
  /** Ed25519 signature hex (mock value). */
  signature: string;
  /** Re-verification outcome. */
  status: BadgeStatus;
  /** Human-readable reason when not verified. */
  note: string;
}

/* ------------------------------------------------------------------ */
/*  B3 — admin credential review queue (§7.4)                         */
/* ------------------------------------------------------------------ */

/** One immutable status-transition decision on a credential (B3). */
export interface CredentialStatusHistory {
  id: string;
  previous_status: BadgeStatus;
  new_status: BadgeStatus;
  reviewer_id: string;
  org_id: string | null;
  reason: string | null;
  created_at: string;
}

/** One flagged (or otherwise reviewable) credential in the admin queue. */
export interface CredentialReview {
  id: string;
  public_id: string;
  user_id: string;
  badge_id: string;
  credential_type: string;
  status: BadgeStatus;
  issuer: string;
  source_event_id: string;
  issued_at: string;
}

/** Review detail — the credential plus its full immutable history. */
export interface CredentialReviewDetail extends CredentialReview {
  history: CredentialStatusHistory[];
}

/** Allowed transition destination (server validates the table; client mirrors it). */
export type CredentialTransitionDestination = "verified" | "revoked";

/** The result of a review decision — current status + appended history. */
export interface CredentialTransitionResult {
  id: string;
  status: BadgeStatus;
  history: CredentialStatusHistory[];
}

/* ------------------------------------------------------------------ */
/*  Skill tree (§6 — read projection over category-level XP)          */
/* ------------------------------------------------------------------ */

export interface SkillTreeNode {
  category: string;
  /** Category-level Completion XP (the projection's only input). */
  completion_xp: number;
  mastery_xp: number;
  /** 0..1 demo-service-derived completion ratio per category. */
  progress: number;
  /** Nested sub-skills (two levels deep in mock). */
  children: { name: string; progress: number; completion_xp: number }[];
}

/* ------------------------------------------------------------------ */
/*  Shareable rank card (§6) + Season Pass (lower priority)           */
/* ------------------------------------------------------------------ */

export interface ShareCardData {
  user_id: string;
  display_name: string;
  rank_name: string;
  level: number;
  prestige_tier: number;
  completion_xp: number;
  mastery_xp: number;
  current_streak_days: number;
  league_tier: LeagueTier | null;
  credential_id: string;
  /** hash-stamped so a shared image is independently verifiable (§7.3) */
  card_hash: string;
}

export interface SeasonMilestone {
  milestone: number;
  /** XP within the current season at which this unlocks. */
  required_season_xp: number;
  reward: string;
  premium: boolean;
  /** 0..1 — reached when season XP >= required. */
  progress: number;
}

export interface SeasonPassState {
  season_id: string;
  season_name: string;
  /** Free + premium milestone track (billing is a separate platform concern). */
  milestones: SeasonMilestone[];
  xp_this_season: number;
  premium_owned: boolean;
}

/* ------------------------------------------------------------------ */
/*  Ledger viewer (§7.2 auditability — the "show me why user X is      */
/*  Rank 7" answer)                                                    */
/* ------------------------------------------------------------------ */

/** Chain verification result for the viewer banner. */
export interface LedgerChainStatus {
  valid: boolean;
  /** Index of the first broken link, if any. */
  broken_at: number | null;
  /** Genesis anchor shown in the UI. */
  genesis_hash: string;
}

/** One versioned ProgressContext snapshot — append-only, never overwritten. */
export interface ContextSnapshot {
  context_version: number;
  computed_at: string;
  rank_name: string;
  level: number;
  completion_xp: number;
  mastery_xp: number;
  current_streak_days: number;
  freeze_status: FreezeStatus;
}

/** Diff between two consecutive context versions (§5.4 step 7). */
export interface ContextVersionDiff {
  from_version: number;
  to_version: number;
  /** Net XP added on each track between versions. */
  completion_delta: number;
  mastery_delta: number;
  /** true if rank_name or level changed. */
  rank_changed: boolean;
  from_rank: string;
  to_rank: string;
}

/** The full audit payload for the ledger viewer. */
export interface LedgerAuditView {
  chain: LedgerChainStatus;
  entries: LedgerEntry[];
  snapshots: ContextSnapshot[];
  diffs: ContextVersionDiff[];
}

/**
 * LedgerEntry plus a demo-service running balance. The §5.3 schema has no
 * balance fields (the chain's prev_hash/entry_hash is the integrity anchor),
 * so balance_before/balance_after are a read projection the engine would
 * serve — never recomputed client-side (build.md §3).
 */
export interface LedgerEntryDetail extends LedgerEntry {
  /** Running XP balance just before this entry applied. */
  balance_before: number;
  /** Running XP balance after this entry applied. */
  balance_after: number;
}
