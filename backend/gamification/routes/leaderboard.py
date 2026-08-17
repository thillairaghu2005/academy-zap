"""Leaderboard read API — reads the Redis sorted-set projection (gamification §2.4, §5.5).

The projection is fed by the real event pipeline (worker), never by the frontend. The board
read is publicly viewable (the landing page preview is unauthenticated); `is_me` and the
caller's own position require authentication. Scope is validated server-side: only `global`
is a real board this slice — `guild` (and org-scoped B2B boards) remain typed 501s.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Query

from gamification.projections.leaderboard import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    LeaderboardProjection,
)
from platform_core.core.deps import CurrentUser, OptionalCurrentUser, RedisClient
from platform_core.core.exceptions import NotImplementedFoundationError

router = APIRouter(tags=["gamification"])


@router.get("/leaderboards/{scope}")
async def get_leaderboard(
    scope: str,
    redis: RedisClient,
    current_user: OptionalCurrentUser,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> dict[str, Any]:
    """Top-N of the board (1-based dense ranks). Public read; `is_me` set only when the viewer
    is authenticated and on the page. The client can never pass user_id/org_id/score — identity
    comes from the token and scores come from the projection."""
    if scope != "global":
        raise NotImplementedFoundationError(
            "guild/org leaderboards", see="ZAPSTERS_GAMIFICATION_ENGINE.md §6"
        )
    viewer_id = str(current_user.id) if current_user is not None else None
    return await LeaderboardProjection(redis).page(
        offset=offset, limit=limit, viewer_user_id=viewer_id
    )


@router.get("/leaderboards/{scope}/me")
async def get_my_leaderboard_position(
    scope: str,
    redis: RedisClient,
    current_user: CurrentUser,
) -> dict[str, Any] | None:
    """The caller's own entry (ZREVRANK, O(log N)) — never computed by loading the board into
    the frontend. Requires auth; the user_id is server-derived from the token."""
    if scope != "global":
        raise NotImplementedFoundationError(
            "guild/org leaderboards", see="ZAPSTERS_GAMIFICATION_ENGINE.md §6"
        )
    return await LeaderboardProjection(redis).my_position(str(current_user.id))
