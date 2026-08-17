"""League/season read API (slice 09 — gamification §5.3 LeagueStanding, §5.4 step 5).

- `GET /seasons/current` — the active season (or the next scheduled one), public metadata.
- `GET /me/league` — the caller's LeagueStanding: tier, season xp, rank within the tier,
  and promotion/relegation zone. Identity comes from the token; rank is read from the
  Redis projection (O(log N)), never computed by the frontend.
- `GET /me/league/leaderboard` — the caller's tier board (same projection).

There is no POST /promote, /demote or /set-score endpoint: those are server-side
outcomes of season finalization only.
"""

from typing import Any

from fastapi import APIRouter, Query
from sqlalchemy import select

from gamification.context.schema import LeagueStanding
from gamification.models import LeagueSeason
from gamification.projections.leagues import LeagueProjection
from gamification.repositories.leagues import MembershipRepository, SeasonRepository
from gamification.services.seasons import STARTING_TIER, SeasonService
from platform_core.core.deps import CurrentUser, DbSession, RedisClient
from platform_core.core.exceptions import ResourceNotFound

router = APIRouter(tags=["gamification"])

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100


@router.get("/seasons/current")
async def get_current_season(session: DbSession) -> dict[str, Any]:
    """The active season's public metadata, or the next scheduled one if none is live."""
    season = await SeasonRepository(session).get_active()
    if season is not None:
        return {
            "status": "active",
            "season": {
                "id": str(season.id),
                "name": season.name,
                "status": season.status,
                "start_at": season.start_at.isoformat(),
                "end_at": season.end_at.isoformat(),
            },
        }
    result = await session.execute(
        select(LeagueSeason)
        .where(LeagueSeason.status == "scheduled")
        .order_by(LeagueSeason.start_at)
        .limit(1)
    )
    season = result.scalars().first()
    if season is None:
        return {"status": "none", "season": None}
    return {
        "status": "scheduled",
        "season": {
            "id": str(season.id),
            "name": season.name,
            "status": season.status,
            "start_at": season.start_at.isoformat(),
            "end_at": season.end_at.isoformat(),
        },
    }


@router.get("/me/league", response_model=LeagueStanding | None)
async def get_my_league(
    session: DbSession,
    redis: RedisClient,
    current_user: CurrentUser,
) -> LeagueStanding | None:
    """The caller's standing in the active season, or None when they have no membership
    (e.g. no season is live). Server-derived, never client state."""
    season = await SeasonRepository(session).get_active()
    if season is None:
        return None
    membership = await MembershipRepository(session).get_for_user_season(
        current_user.id, season.id
    )
    if membership is None:
        # No membership yet — join at the starting tier with their authoritative season XP.
        service = SeasonService(session)
        membership = await service.upsert_membership(
            user_id=current_user.id, season=season, tier_id=STARTING_TIER
        )
        await session.flush()

    standing = await LeagueProjection(redis).my_standing(
        season_id=str(season.id),
        tier_id=membership.league_tier,
        user_id=str(current_user.id),
    )
    rank = standing["rank"] if standing else None
    total = int(
        (
            await LeagueProjection(redis).page(
                season_id=str(season.id), tier_id=membership.league_tier, offset=0, limit=1
            )
        )["total"]
    )
    promotion_zone, relegation_zone = await SeasonService(session).standing_zones(
        season=season,
        tier_id=membership.league_tier,
        rank_in_league=rank,
        total_members=total,
    )
    return LeagueStanding(
        user_id=current_user.id,
        season_id=season.id,
        league_tier=membership.league_tier,
        # Unranked on the Redis projection (no season events yet) → 0, matching the
        # frontend contract (rank_in_league is a plain int; the UI renders 0 as unranked).
        rank_in_league=rank if rank is not None else 0,
        xp_this_season=membership.xp_this_season,
        promotion_zone=promotion_zone,
        relegation_zone=relegation_zone,
    )


@router.get("/me/league/leaderboard")
async def get_my_league_leaderboard(
    session: DbSession,
    redis: RedisClient,
    current_user: CurrentUser,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
) -> dict[str, Any]:
    """The caller's tier board. Public read of the tier; `is_me` marks the caller's row."""
    season = await SeasonRepository(session).get_active()
    if season is None:
        raise ResourceNotFound("No active season.")
    membership = await MembershipRepository(session).get_for_user_season(
        current_user.id, season.id
    )
    tier_id = membership.league_tier if membership else STARTING_TIER
    return await LeagueProjection(redis).page(
        season_id=str(season.id),
        tier_id=tier_id,
        offset=offset,
        limit=limit,
        viewer_user_id=str(current_user.id),
    )
