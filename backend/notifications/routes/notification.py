"""In-app notification feed — 501 stub. No owned tables this round; email/push delivery and the
notification-center backing store are build.md B9.
"""

from fastapi import APIRouter

from platform_core.contracts.notification import NotificationPage
from platform_core.core.deps import CurrentUser
from platform_core.core.exceptions import NotImplementedFoundationError

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationPage)
async def list_notifications(_current_user: CurrentUser) -> NotificationPage:
    raise NotImplementedFoundationError(
        "notifications", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §2.2"
    )
