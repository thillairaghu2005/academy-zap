"""Leaderboard projections — 501 stub. Redis sorted-set projections (build.md B4) aren't built
this round; the resolver only produces `ProgressContext` for one user at a time.
"""

from fastapi import APIRouter

from platform_core.core.deps import CurrentUser
from platform_core.core.exceptions import NotImplementedFoundationError

router = APIRouter(tags=["gamification"])


@router.get("/leaderboards/{scope}")
async def get_leaderboard(scope: str, _current_user: CurrentUser) -> None:
    raise NotImplementedFoundationError("gamification", see="ZAPSTERS_GAMIFICATION_ENGINE.md §6")
