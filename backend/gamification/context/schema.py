"""§5.3 — the frozen ProgressContext schema, transcribed verbatim from
`lib/contracts/gamification.ts` (itself transcribed verbatim from the doc). Nothing downstream
re-derives a rank, streak, league, or guild standing — everything reads `ProgressContext`.
"""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

XpType = Literal["completion", "mastery", "bonus", "adjustment"]
IntegrityStatus = Literal["verified", "flagged", "reversed"]
StreakStatus = Literal["active", "grace_period", "broken", "frozen"]
LeagueTier = Literal["bronze", "silver", "gold", "platinum", "obsidian"]
FreezeStatus = Literal["live", "frozen_pending_review"]


class LedgerEntry(BaseModel):
    """One append-only row of the xp_ledger."""

    id: UUID
    user_id: UUID
    event_id: UUID
    xp_type: XpType
    xp_delta: int
    reason_code: str
    multiplier_applied: float
    prev_hash: str
    entry_hash: str
    created_at: datetime
    integrity_status: IntegrityStatus


class StreakState(BaseModel):
    user_id: UUID
    current_streak_days: int
    longest_streak_days: int
    freeze_tokens_available: int
    momentum_multiplier: float
    last_active_date: date
    status: StreakStatus


class RankState(BaseModel):
    user_id: UUID
    level: int
    rank_name: str
    prestige_tier: int
    completion_xp: int
    mastery_xp: int
    rank_progress_pct: float
    percentile_global: float
    percentile_cohort: float | None
    specialization_tag: str | None


class LeagueStanding(BaseModel):
    user_id: UUID
    season_id: UUID
    league_tier: LeagueTier
    rank_in_league: int
    xp_this_season: int
    promotion_zone: bool
    relegation_zone: bool


class GuildRollup(BaseModel):
    guild_id: UUID
    member_count: int
    combined_xp_this_week: int
    guild_rank_global: int


class ProgressContext(BaseModel):
    """The ONE frozen object every projection reads."""

    context_version: int
    user_id: UUID
    computed_at: datetime
    rank: RankState
    streak: StreakState
    league: LeagueStanding | None
    guild: GuildRollup | None
    unresolved_flags: list[str]
    freeze_status: FreezeStatus
