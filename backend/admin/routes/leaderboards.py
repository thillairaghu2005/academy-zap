from fastapi import APIRouter

from gamification.projections.leaderboard import LeaderboardProjection
from platform_core.core.deps import DbSession, RedisClient, require_role
from platform_core.core.rbac import Role

router = APIRouter(prefix="/admin", tags=["admin", "gamification"])


@router.post("/leaderboards/global/rebuild", dependencies=[require_role(Role.PLATFORM_OPS)])
async def rebuild_global_leaderboard(
    session: DbSession,
    redis: RedisClient,
) -> dict[str, str]:
    """Rebuilds the global leaderboard from the canonical ledger."""
    projection = LeaderboardProjection(redis)
    await projection.rebuild(session)
    return {"status": "ok", "message": "Leaderboard rebuild initiated."}
