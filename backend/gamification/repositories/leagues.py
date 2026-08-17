"""Database queries for the season/league surface (slice 09) — no business logic
(fastapi-backend-sop.md §1.1, §13).

The XP ledger stays the ONLY XP authority. `season_membership.xp_this_season` is a
derived, time-boxed slice over it, recomputed server-side; this module just reads and
writes those rows.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select, update
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
        """The single active season (the only status with at most one row — enforced by the
        season service's activation guard, not by a partial-unique constraint, so the tests'
        throwaway DB doesn't need the constraint either)."""
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

    async def set_status(self, season_id: uuid.UUID, status: str) -> bool:
        """Guarded status transition — returns True only when the row actually moved. Used
        for the irreversible scheduled -> active and active -> completed transitions, which
        makes finalization idempotent under retries/concurrency."""
        result = await self._session.execute(
            update(LeagueSeason)
            .where(LeagueSeason.id == season_id)
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

    async def upsert(
        self,
        *,
        user_id: uuid.UUID,
        season_id: uuid.UUID,
        league_tier: str,
        xp_this_season: int,
    ) -> SeasonMembership:
        """Create-or-update one membership. Idempotent per (user, season) — the unique
        constraint is the hard guarantee; a concurrent duplicate insert surfaces as a
        conflict and the caller re-reads."""
        existing = await self.get_for_user_season(user_id, season_id)
        if existing is not None:
            existing.league_tier = league_tier
            existing.xp_this_season = xp_this_season
            await self._session.flush()
            return existing
        membership = SeasonMembership(
            id=uuid.uuid4(),
            user_id=user_id,
            season_id=season_id,
            league_tier=league_tier,
            xp_this_season=xp_this_season,
        )
        self._session.add(membership)
        await self._session.flush()
        return membership

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
    ) -> None:
        await self._session.execute(
            update(SeasonMembership)
            .where(
                SeasonMembership.user_id == user_id,
                SeasonMembership.season_id == season_id,
            )
            .values(outcome=outcome, league_tier=league_tier)
        )
