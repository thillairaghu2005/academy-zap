"""Judge submit/poll routes — HTTP 202 queue semantics, never inline execution (platform §5).

Slice 10 remediation:
- F-5: `GET /judge/submissions/{id}` enforces ownership + tenant at the repository layer.
- F-13: domain errors map to proper 4xx (403/422/404), never a bare ValueError → 500.
- F-14: the submit route is rate-limited per authenticated user AND per tenant (Redis-backed),
  not per IP.
- F-7: `POST /judge/submissions/{id}/ticket` exchanges the caller's access token for a
  short-lived single-use SSE ticket bound to the submission owner — the EventSource URL carries
  the ticket, never the token, and never opens a channel for another user's submission.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response

from judge.services.submission import SubmissionService
from platform_core.contracts.judge import CodeSubmission, JudgeResult, SubmissionAccepted
from platform_core.core.db.session import get_session
from platform_core.core.deps import CurrentUser
from platform_core.core.exceptions import ResourceNotFound
from platform_core.core.models.user import User
from platform_core.core.rate_limiting import AuthenticatedRateLimiter
from platform_core.core.rate_limits import JUDGE_SUBMIT_RATE_LIMIT
from platform_core.core.redis import AsyncRedis, get_redis

router = APIRouter(prefix="/judge", tags=["judge"])

DbSession = Annotated[AsyncSession, Depends(get_session)]
DbRedis = Annotated[AsyncRedis, Depends(get_redis)]

_judge_submit_rate_limit = AuthenticatedRateLimiter(
    times=JUDGE_SUBMIT_RATE_LIMIT.times,
    seconds=JUDGE_SUBMIT_RATE_LIMIT.seconds,
)


async def _judge_submit_rate_limited(
    request: Request,
    response: Response,
    _current_user: CurrentUser,
) -> None:
    """Per-user + per-tenant Redis-backed limit (F-14). Declaring ``CurrentUser`` here
    guarantees the authenticated identity (not the IP) keys the window."""
    await _judge_submit_rate_limit.check_user(request, response, _current_user)


@router.post(
    "/submit",
    response_model=SubmissionAccepted,
    status_code=202,
)
async def submit(
    submission: CodeSubmission,
    _current_user: CurrentUser,
    _rate_limited: Annotated[None, Depends(_judge_submit_rate_limited)],
    session: DbSession,
    redis: DbRedis,
) -> SubmissionAccepted:
    return await SubmissionService(session, redis).submit(submission, user=_current_user)


@router.get("/submissions/{submission_id}", response_model=JudgeResult)
async def get_result(
    submission_id: uuid.UUID,
    _current_user: CurrentUser,
    session: DbSession,
) -> JudgeResult:
    return await SubmissionService(session).get_result(submission_id, user=_current_user)


@router.post("/submissions/{submission_id}/ticket")
async def create_submission_sse_ticket(
    submission_id: uuid.UUID,
    _current_user: CurrentUser,
    session: DbSession,
    redis: DbRedis,
) -> dict[str, object]:
    """Single-use SSE ticket for this submission's stream (F-7).

    Auth + ownership + tenant are verified HERE, at issuance, mirroring the gamification SSE
    pattern (`/events/ticket`): the ticket is a short-lived opaque credential stored in Redis,
    never the access token, and it is bound to the submitting user — so an SSE URL cannot be
    replayed into the API and cannot subscribe to another user's submission.
    """
    svc = SubmissionService(session, redis)
    await svc.get_result_for_ownership_check(submission_id, user=_current_user)

    from judge.realtime.tickets import judge_sse_tickets

    ticket = await judge_sse_tickets.issue(redis, user_id=str(_current_user.id))
    return {"ticket": ticket, "expires_in": judge_sse_tickets.ttl_seconds}


# Re-exported for the stream route; kept here so the ownership check stays one query.
async def _submission_owned_by(
    session: AsyncSession, submission_id: uuid.UUID, user: User
) -> bool:
    svc = SubmissionService(session)
    try:
        await svc.get_result_for_ownership_check(submission_id, user=user)
        return True
    except ResourceNotFound:
        return False
