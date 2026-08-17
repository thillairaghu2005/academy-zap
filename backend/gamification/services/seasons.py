"""Season/league service (slice 09 — gamification §5.4 step 5, §8 "Seasonal leagues").

The XP ledger stays the ONLY XP authority. `xp_this_season` is a deterministic, server-side
time-boxed slice of the ledger (`sum(xp_delta)` over entries with `created_at` inside
[start_at, end_at)); the service never accepts a client-supplied score.

Season lifecycle (one-way forward, guarded at the DB level so retries are idempotent):
  scheduled -> active (activation)
  active     -> completed (finalization)

Finalization semantics (smallest deterministic rules — the doc pins the tiers and the
time-boxing but not promotion counts, so these are explicit slice-09 decisions):
- Promotion: top `promotion_slots` members of every tier move up one tier (bronze -> silver
  -> gold -> platinum -> obsidian). Obsidian's top slots stay (no tier above).
- Demotion: bottom `demotion_slots` members of every tier move down one tier. Bronze's
  bottom slots stay (no tier below).
- Inactive members (xp_this_season == 0) are never promoted or demoted — they are retained.
- Frozen users (§7.4) are excluded from the public league board and from promotion.
- Retry/concurrency: `set_status(active -> completed)` returns False on a stale attempt, so
  running finalization twice produces byte-identical state and no duplicate outcomes.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.models import LeagueSeason, LedgerEntry, SeasonMembership
from gamification.projections.leagues import LeagueProjection
from gamification.repositories.leagues import (
    LeagueTierRepository,
    MembershipRepository,
    SeasonRepository,
)
from platform_core.core.repositories.user import UserRepository

# Named constants — promotion/demotion widths are product knobs, not inferred values.
DEFAULT_PROMOTION_SLOTS = 3
DEFAULT_DEMOTION_SLOTS = 3
STARTING_TIER = "bronze"


class SeasonService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._seasons = SeasonRepository(session)
        self._tiers = LeagueTierRepository(session)
        self._members = MembershipRepository(session)
        self._users = UserRepository(session)

    # -- membership ---------------------------------------------------------------

    async def compute_season_xp(self, user_id: uuid.UUID, season: LeagueSeason) -> int:
        """Deterministic server-side season XP: sum of ledger deltas inside the season's
        time box. Never reads client state, never touches other users' rows."""
        result = await self._session.execute(
            select(func.coalesce(func.sum(LedgerEntry.xp_delta), 0)).where(
                LedgerEntry.user_id == user_id,
                LedgerEntry.created_at >= season.start_at,
                LedgerEntry.created_at < season.end_at,
            )
        )
        return int(result.scalar_one())

    async def upsert_membership(
        self, *, user_id: uuid.UUID, season: LeagueSeason, tier_id: str
    ) -> SeasonMembership:
        xp = await self.compute_season_xp(user_id, season)
        return await self._members.upsert(
            user_id=user_id,
            season_id=season.id,
            league_tier=tier_id,
            xp_this_season=xp,
        )

    # -- finalization -------------------------------------------------------------

    async def finalize_season(self, season_id: uuid.UUID) -> dict[str, int]:
        """Close an active season: compute ranks, apply promotion/demotion, freeze outcomes.

        Idempotent: the active -> completed guard means a second call (retry, concurrent
        cron, replayed job) sees no active row and returns the already-frozen outcome
        counts without rewriting anything. Returns {promoted, demoted, retained} for the
        first (winning) finalization.
        """
        season = await self._seasons.get_by_id(season_id)
        if season is None:
            raise ValueError(f"Unknown season: {season_id}")
        if season.status == "completed":
            # Already finalized — replay returns zero new writes (idempotency).
            return {"promoted": 0, "demoted": 0, "retained": 0}

        moved = await self._seasons.set_status(season_id, "completed")
        if not moved:
            # A concurrent finalization won the transition; this is a replay.
            return {"promoted": 0, "demoted": 0, "retained": 0}

        tiers = {t.tier_id: t.display_order for t in await self._tiers.list_all()}
        max_order = max(tiers.values(), default=0)
        min_order = min(tiers.values(), default=0)
        order_to_tier = {order: tier_id for tier_id, order in tiers.items()}

        members = await self._members.list_for_season(season_id)
        frozen_user_ids = await self._frozen_user_ids(season_id)

        by_tier: dict[str, list[SeasonMembership]] = {}
        for member in members:
            by_tier.setdefault(member.league_tier, []).append(member)

        config = season.config or {}
        promote_n = int(config.get("promotion_slots", DEFAULT_PROMOTION_SLOTS))
        demote_n = int(config.get("demotion_slots", DEFAULT_DEMOTION_SLOTS))

        promoted = demoted = retained = 0
        for tier_id, tier_members in by_tier.items():
            order = tiers.get(tier_id)
            if order is None:
                continue
            # Deterministic rank within the tier: xp desc, then user_id asc.
            tier_members.sort(key=lambda m: (-m.xp_this_season, str(m.user_id)))
            active_members = [
                m for m in tier_members if str(m.user_id) not in frozen_user_ids
            ]
            for index, member in enumerate(active_members):
                if member.xp_this_season <= 0:
                    outcome = "retained"
                elif index < promote_n and order < max_order:
                    outcome = "promoted"
                elif index >= len(active_members) - demote_n and order > min_order:
                    outcome = "demoted"
                else:
                    outcome = "retained"

                if outcome == "promoted":
                    next_tier = order_to_tier.get(order + 1, tier_id)
                elif outcome == "demoted":
                    next_tier = order_to_tier.get(order - 1, tier_id)
                else:
                    next_tier = tier_id

                await self._members.set_outcome(
                    user_id=member.user_id,
                    season_id=season_id,
                    outcome=outcome,
                    league_tier=next_tier,
                )
                if outcome == "promoted":
                    promoted += 1
                elif outcome == "demoted":
                    demoted += 1
                else:
                    retained += 1

            # Frozen users get an explicit retained outcome too (they can't be promoted or
            # demoted, but their membership is not left unannotated).
            for member in tier_members:
                if str(member.user_id) in frozen_user_ids and member.outcome is None:
                    await self._members.set_outcome(
                        user_id=member.user_id,
                        season_id=season_id,
                        outcome="retained",
                        league_tier=member.league_tier,
                    )
                    retained += 1

        await self._session.flush()
        return {"promoted": promoted, "demoted": demoted, "retained": retained}

    async def _frozen_user_ids(self, season_id: uuid.UUID) -> set[str]:
        """Users whose public league visibility is frozen (§7.4) — excluded from the board
        and from promotion. A user is frozen when any of their season entries are flagged."""
        season = await self._seasons.get_by_id(season_id)
        if season is None:
            return set()
        result = await self._session.execute(
            select(LedgerEntry.user_id).where(
                LedgerEntry.integrity_status == "flagged",
                LedgerEntry.created_at >= season.start_at,
                LedgerEntry.created_at < season.end_at,
            )
        )
        return {str(row) for row in result.scalars().all()}

    async def apply_event_delta(
        self, *, user_id: uuid.UUID, xp_delta: int, occurred_at: datetime, redis: Any
    ) -> None:
        """Keep the active season's membership + Redis board fresh after an accepted event.

        Only runs when an event actually lands inside the active season's window; the delta
        is the SAME authoritative value the ledger wrote (never recomputed, never client
        input). Idempotent by construction: replaying an event (idempotency marker) never
        reaches here, and re-processing a committed delta would re-add it only if the
        worker bypassed the marker — the DB unique constraint plus the pipeline's
        redelivery rules prevent that.
        """
        season = await self._seasons.get_active()
        if season is None:
            return
        if not (season.start_at <= occurred_at < season.end_at):
            return
        membership = await self._members.get_for_user_season(user_id, season.id)
        if membership is None:
            membership = await self.upsert_membership(
                user_id=user_id, season=season, tier_id=STARTING_TIER
            )
        else:
            membership.xp_this_season += xp_delta
            await self._session.flush()
        user = await self._users.get_by_id(user_id)
        await LeagueProjection(redis).update_member(
            season_id=str(season.id),
            tier_id=membership.league_tier,
            user_id=str(user_id),
            xp_this_season=membership.xp_this_season,
            display_name=user.display_name if user else "Learner",
        )

    async def refresh_league_projection(self, redis: Any) -> None:
        """Rebuild every active season tier's board from authoritative membership rows —
        the projection is always reconstructible from the ledger (slice 09, Phase 24)."""
        season = await self._seasons.get_active()
        if season is None:
            return
        members = await self._members.list_for_season(season.id)
        users = await self._users.get_by_ids({m.user_id for m in members})
        display_names = {str(u.id): u.display_name for u in users}
        projection = LeagueProjection(redis)
        by_tier: dict[str, list[SeasonMembership]] = {}
        for member in members:
            by_tier.setdefault(member.league_tier, []).append(member)
        for tier_id, tier_members in by_tier.items():
            rows = [
                (
                    str(m.user_id),
                    m.xp_this_season,
                    display_names.get(str(m.user_id), "Learner"),
                )
                for m in tier_members
            ]
            await projection.rebuild_from_memberships(
                season_id=str(season.id), tier_id=tier_id, members=rows
            )


def now_utc() -> datetime:
    return datetime.now(UTC)
