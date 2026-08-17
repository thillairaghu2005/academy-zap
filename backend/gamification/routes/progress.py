from fastapi import APIRouter, Depends
from gamification.repositories.context import ContextRepository
from gamification.context.schema import ProgressContext, RankState, StreakState
from platform_core.core.deps import CurrentUser, DbSession
from platform_core.core.rate_limits import PUBLIC_RATE_LIMIT
from platform_core.core.rate_limiting import CompatibleRateLimiter
import datetime

router = APIRouter(tags=["gamification"])

_public_rate_limit = CompatibleRateLimiter(
    times=PUBLIC_RATE_LIMIT.times,
    seconds=PUBLIC_RATE_LIMIT.seconds,
)

@router.get("/me/progress", response_model=ProgressContext, dependencies=[Depends(_public_rate_limit)])
async def get_my_progress(session: DbSession, current_user: CurrentUser) -> ProgressContext:
    context = await ContextRepository(session).get_latest(current_user.id)
    if context is None:
        return ProgressContext(
            user_id=current_user.id,
            context_version=0,
            computed_at=datetime.datetime.now(datetime.UTC),
            rank=RankState(
                user_id=current_user.id,
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
                user_id=current_user.id,
                current_streak_days=0,
                longest_streak_days=0,
                freeze_tokens_available=0,
                momentum_multiplier=1.0,
                last_active_date=datetime.datetime.now(datetime.UTC).date(),
                status="broken"
            ),
            league=None,
            guild=None,
            unresolved_flags=[],
            freeze_status="live"
        )
    return context
