import datetime
import uuid

from fastapi import APIRouter, Depends

from gamification.context.schema import (
    GuildRollup,
    LeagueStanding,
    ProgressContext,
    RankState,
    StreakState,
)
from gamification.repositories.context import ContextRepository
from platform_core.core.deps import CurrentUser, DbSession
from platform_core.core.rate_limiting import CompatibleRateLimiter
from platform_core.core.rate_limits import PUBLIC_RATE_LIMIT

router = APIRouter(tags=["gamification"])

_public_rate_limit = CompatibleRateLimiter(
    times=PUBLIC_RATE_LIMIT.times,
    seconds=PUBLIC_RATE_LIMIT.seconds,
)


def _default_context(user_id: uuid.UUID) -> ProgressContext:
    return ProgressContext(
        user_id=user_id,
        context_version=0,
        computed_at=datetime.datetime.now(datetime.UTC),
        rank=RankState(
            user_id=user_id,
            level=1,
            rank_name="Initiate",
            prestige_tier=0,
            completion_xp=0,
            mastery_xp=0,
            rank_progress_pct=0.0,
            percentile_global=0.0,
            percentile_cohort=None,
            specialization_tag=None,
        ),
        streak=StreakState(
            user_id=user_id,
            current_streak_days=0,
            longest_streak_days=0,
            freeze_tokens_available=0,
            momentum_multiplier=1.0,
            last_active_date=datetime.datetime.now(datetime.UTC).date(),
            status="broken",
        ),
        league=None,
        guild=None,
        unresolved_flags=[],
        freeze_status="live",
    )


@router.get(
    "/me/progress", response_model=ProgressContext, dependencies=[Depends(_public_rate_limit)]
)
async def get_my_progress(session: DbSession, current_user: CurrentUser) -> ProgressContext:
    snapshot = await ContextRepository(session).get_latest(current_user.id)
    if snapshot is None:
        return _default_context(current_user.id)
    # The snapshot stores rank/streak/league/guild as JSONB; the frozen ProgressContext
    # contract requires the typed shapes — validate the dicts into them explicitly.
    return ProgressContext(
        user_id=snapshot.user_id,
        context_version=snapshot.context_version,
        computed_at=snapshot.computed_at,
        rank=RankState(**snapshot.rank),
        streak=StreakState(**snapshot.streak),
        league=LeagueStanding(**snapshot.league) if snapshot.league else None,
        guild=GuildRollup(**snapshot.guild) if snapshot.guild else None,
        unresolved_flags=snapshot.unresolved_flags,
        freeze_status=snapshot.freeze_status,
    )
