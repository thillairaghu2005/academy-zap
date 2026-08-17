"""Badge read API (slice 08, Phase 18).

`GET /me/badges` — the authenticated user's badge wall. The user identity comes from the
access token (server-derived, never client-supplied), and the rows are served from the
authoritative award + signed-credential tables written by the event pipeline. There is no
award/issue endpoint: the frontend can never create a badge or a credential.
"""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from gamification.projections.badges import BadgeEvaluator
from platform_core.core.deps import CurrentUser, DbSession

router = APIRouter(tags=["gamification"])


class BadgeRead(BaseModel):
    """The locked frontend `Badge` contract (lib/contracts/gamification.ts §7.3)."""

    badge_id: str
    name: str
    description: str
    credential_id: str
    verify_url: str
    earned_at: datetime
    status: str
    category: str


@router.get("/me/badges", response_model=list[BadgeRead])
async def get_my_badges(session: DbSession, current_user: CurrentUser) -> list[BadgeRead]:
    badges = await BadgeEvaluator(session).list_badges_for_user(current_user.id)
    return [BadgeRead(**badge) for badge in badges]
