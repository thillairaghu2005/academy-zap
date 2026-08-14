from fastapi import APIRouter

from gamification.context.resolver import ProgressContextResolver
from gamification.context.schema import ProgressContext
from platform_core.core.deps import CurrentUser, DbSession

router = APIRouter(tags=["gamification"])


@router.get("/me/progress", response_model=ProgressContext)
async def get_my_progress(session: DbSession, current_user: CurrentUser) -> ProgressContext:
    return await ProgressContextResolver(session).resolve(current_user.id)
