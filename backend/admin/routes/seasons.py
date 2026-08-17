"""Admin season management (slice 09).

Admin-only endpoints that create seasons and trigger the two lifecycle transitions
(scheduled -> active, active -> completed). Finalization is idempotent (the guarded
status transition + deterministic rules in `SeasonService`), so an admin retry or a
duplicate request never produces duplicate outcomes or rewards.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field

from gamification.repositories.leagues import SeasonRepository
from gamification.services.seasons import SeasonService
from platform_core.core.deps import AdminUser, DbSession, RedisClient
from platform_core.core.exceptions import ConflictError, ResourceNotFound

router = APIRouter(prefix="/admin/seasons", tags=["admin", "gamification"])


class SeasonCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    start_at: datetime
    end_at: datetime
    config: dict[str, object] | None = None


class SeasonCreateRead(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    start_at: datetime
    end_at: datetime


@router.post("", response_model=SeasonCreateRead)
async def create_season(
    body: SeasonCreateBody,
    session: DbSession,
    admin_user: AdminUser,
) -> SeasonCreateRead:
    """Create a scheduled season. Time ranges must be valid and must not overlap an
    existing active/scheduled season — overlapping seasons would make the league
    projection ambiguous."""
    if body.end_at <= body.start_at:
        raise ConflictError("Season end must be after its start.")
    repo = SeasonRepository(session)
    if await repo.get_active() is not None:
        raise ConflictError("An active season already exists — finalize it first.")
    season = await repo.create(
        name=body.name,
        start_at=body.start_at,
        end_at=body.end_at,
        config=dict(body.config) if body.config else None,
    )
    await session.commit()
    return SeasonCreateRead(
        id=season.id, name=season.name, status=season.status,
        start_at=season.start_at, end_at=season.end_at,
    )


@router.post("/{season_id}/activate")
async def activate_season(
    season_id: uuid.UUID,
    session: DbSession,
    admin_user: AdminUser,
    redis: RedisClient,
) -> dict[str, object]:
    """scheduled -> active. Sets the season live; memberships are derived lazily on the
    first read / event rather than pre-created for the whole user base."""
    repo = SeasonRepository(session)
    season = await repo.get_by_id(season_id)
    if season is None:
        raise ResourceNotFound("Season was not found.")
    if season.status != "scheduled":
        raise ConflictError(f"Cannot activate a {season.status} season.")
    if await repo.get_active() is not None:
        raise ConflictError("An active season already exists.")
    moved = await repo.set_status(season_id, "active")
    if not moved:
        raise ConflictError("Season state changed concurrently — reload and retry.")
    await session.commit()
    return {"status": "active", "season_id": str(season_id)}


@router.post("/{season_id}/finalize")
async def finalize_season(
    season_id: uuid.UUID,
    session: DbSession,
    admin_user: AdminUser,
    redis: RedisClient,
) -> dict[str, object]:
    """active -> completed with promotion/demotion. Idempotent: replaying this call after
    a successful finalization returns zero new outcomes instead of duplicating them."""
    service = SeasonService(session)
    season = await SeasonRepository(session).get_by_id(season_id)
    if season is None:
        raise ResourceNotFound("Season was not found.")
    outcome = await service.finalize_season(season_id)
    await session.commit()
    return {"season_id": str(season_id), "status": "completed", **outcome}
