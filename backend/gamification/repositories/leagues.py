"""Database queries for the season/league surface (slice 09) — no business logic
(fastapi-backend-sop.md §1.1, §13).

The XP ledger stays the ONLY XP authority. `season_membership.xp_this_season` is a
derived, time-boxed slice over it, recomputed server-side; this module just reads and
writes those rows.
"""

import uuid
from datetime import datetime
from typing import Any, cast

from sqlalchemy import select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.models import LeagueSeason, LeagueTier, SeasonMembership


class SeasonRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, season_id: uuid.UUID) -> LeagueSeason | None:
        result = await self._session.execute(
            select(LeagueSeason).where(LeagueSeason.id == season_id)
        )
        return result.scalar_one_or_none()

    async def get_active(self) -> LeagueSeason | None:
        """The single active season. At most one row can ever be `active`: the service's
        activation guard is the app-level fast path, and the partial unique index
        `uq_league_season_single_active` (status = 'active') is the DB-level guarantee
        under concurrency — both exist, and the index also covers the tests' throwaway
        DB, which is built from the same model."""
        result = await self._session.execute(
            select(LeagueSeason)
            .where(LeagueSeason.status == "active")
            .order_by(LeagueSeason.start_at)
        )
        return result.scalars().first()

    async def create(
        self,
        *,
        name: str,
        start_at: datetime,
        end_at: datetime,
        config: dict[str, Any] | None = None,
    ) -> LeagueSeason:
        season = LeagueSeason(
            id=uuid.uuid4(),
            name=name,
            status="scheduled",
            start_at=start_at,
            end_at=end_at,
            config=config or {},
        )
        self._session.add(season)
        await self._session.flush()
        return season

    async def set_status(
        self, season_id: uuid.UUID, status: str, *, expected_status: str
    ) -> bool:
        """Guarded compare-and-swap status transition — returns True only when the row
        actually moved FROM `expected_status`. Used for the irreversible
        scheduled -> active and active -> completed transitions: two concurrent
        finalizers both attempt `active -> completed`, but the UPDATE matches only the
        row still in `active`, so exactly one wins and the other sees no row (False).
        This is what makes finalization idempotent under retries AND concurrency."""
        result = await self._session.execute(
            update(LeagueSeason)
            .where(
                LeagueSeason.id == season_id,
                LeagueSeason.status == expected_status,
            )
            .values(status=status)
            .returning(LeagueSeason.id)
        )
        return result.first() is not None


class LeagueTierRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[LeagueTier]:
        result = await self._session.execute(
            select(LeagueTier).order_by(LeagueTier.display_order)
        )
        return list(result.scalars().all())

    async def get_by_id(self, tier_id: str) -> LeagueTier | None:
        result = await self._session.execute(
            select(LeagueTier).where(LeagueTier.tier_id == tier_id)
        )
        return result.scalar_one_or_none()


class MembershipRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_for_user_season(
        self, user_id: uuid.UUID, season_id: uuid.UUID
    ) -> SeasonMembership | None:
        result = await self._session.execute(
            select(SeasonMembership).where(
                SeasonMembership.user_id == user_id,
                SeasonMembership.season_id == season_id,
            )
        )
        return result.scalar_one_or_none()

    async def insert_if_absent(
        self,
        *,
        user_id: uuid.UUID,
        season_id: uuid.UUID,
        league_tier: str,
        xp_this_season: int,
    ) -> tuple[SeasonMembership, bool]:
        """INSERT ... ON CONFLICT DO NOTHING (insert-if-absent) for one membership.

        Returns `(row, inserted)`: the membership row (the new row when `inserted` is
        True, the PRE-EXISTING row otherwise) and whether this call created it. The
        conflict path never mutates the existing row — in particular it never touches
        `xp_this_season`, which is owned by the ledger-derived increment path
        (`SeasonService.apply_event_delta`). A stale reader (e.g. `GET /me/league`
        racing a worker) therefore can never overwrite the authoritative XP."""
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        stmt = (
            pg_insert(SeasonMembership)
            .values(
                id=uuid.uuid4(),
                user_id=user_id,
                season_id=season_id,
                league_tier=league_tier,
                xp_this_season=xp_this_season,
            )
            .on_conflict_do_nothing(
                index_elements=[SeasonMembership.user_id, SeasonMembership.season_id]
            )
            .returning(SeasonMembership.id)
        )
        inserted = await self._session.execute(stmt)
        existing = await self.get_for_user_season(user_id, season_id)
        assert existing is not None
        return existing, inserted.scalar_one_or_none() is not None

    async def upsert(
        self,
        *,
        user_id: uuid.UUID,
        season_id: uuid.UUID,
        league_tier: str,
        xp_this_season: int,
    ) -> SeasonMembership:
        """Insert-if-absent one membership and return it. Idempotent per (user, season):
        the UNIQUE constraint is the hard guarantee, and the INSERT is
        `ON CONFLICT DO NOTHING` so two simultaneous first events for the same user
        cannot raise. On conflict the EXISTING row is returned UNMODIFIED — the caller's
        `xp_this_season` is never written over the row's authoritative value.

        Incremental XP updates belong to `SeasonService.apply_event_delta` (via
        `insert_if_absent`), which needs to know whether its insert won to decide whether
        the delta still has to be applied; readers that only need "give me my membership
        row, creating it if absent" use this wrapper."""
        row, _ = await self.insert_if_absent(
            user_id=user_id,
            season_id=season_id,
            league_tier=league_tier,
            xp_this_season=xp_this_season,
        )
        return row

    async def list_for_season(self, season_id: uuid.UUID) -> list[SeasonMembership]:
        result = await self._session.execute(
            select(SeasonMembership)
            .where(SeasonMembership.season_id == season_id)
            .order_by(SeasonMembership.xp_this_season.desc(), SeasonMembership.user_id)
        )
        return list(result.scalars().all())

    async def list_for_tier(self, season_id: uuid.UUID, tier_id: str) -> list[SeasonMembership]:
        result = await self._session.execute(
            select(SeasonMembership)
            .where(
                SeasonMembership.season_id == season_id,
                SeasonMembership.league_tier == tier_id,
            )
            .order_by(SeasonMembership.xp_this_season.desc(), SeasonMembership.user_id)
        )
        return list(result.scalars().all())

    async def set_outcome(
        self, *, user_id: uuid.UUID, season_id: uuid.UUID, outcome: str, league_tier: str
    ) -> bool:
        """Write the finalization outcome for one membership. Write-once: the UPDATE only
        matches rows whose outcome is still NULL, so a completed season's frozen outcomes
        can never be casually overwritten by a replayed or stray call (defense-in-depth
        on top of the guarded active -> completed transition in `finalize_season`).
        Returns True when a row was actually updated."""
        result = await self._session.execute(
            update(SeasonMembership)
            .where(
                SeasonMembership.user_id == user_id,
                SeasonMembership.season_id == season_id,
                SeasonMembership.outcome.is_(None),
            )
            .values(outcome=outcome, league_tier=league_tier)
        )
        # DML executes return a CursorResult whose rowcount is the updated-row count.
        rowcount = cast("CursorResult[Any]", result).rowcount
        return bool(rowcount)
