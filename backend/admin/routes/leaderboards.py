from fastapi import APIRouter
from sqlalchemy import select

from gamification.context.resolver import ProgressContextResolver
from gamification.projections.leaderboard import LeaderboardProjection
from platform_core.core.deps import DbSession, RedisClient, require_role
from platform_core.core.models.user import User
from platform_core.core.rbac import Role

router = APIRouter(prefix="/admin", tags=["admin", "gamification"])


@router.post("/leaderboards/global/rebuild", dependencies=[require_role(Role.PLATFORM_OPS)])
async def rebuild_global_leaderboard(
    session: DbSession,
    redis: RedisClient,
) -> dict[str, str]:
    """Rebuilds the global leaderboard from the canonical ledger.

    Authoritative inputs only: every user's resolved ProgressContext from the XP ledger,
    plus public display names from the user table — never Redis, never client state.
    """
    users = (
        await session.execute(select(User).where(User.is_active.is_(True)))
    ).scalars().all()
    display_names = {str(user.id): user.display_name for user in users}

    resolver = ProgressContextResolver(session)
    contexts = [await resolver.resolve(user.id) for user in users]

    projection = LeaderboardProjection(redis)
    count = await projection.rebuild(contexts, display_names)
    return {"status": "ok", "message": f"Leaderboard rebuilt with {count} members."}
