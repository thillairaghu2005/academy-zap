"""Judge SSE stream — notification-only transport, secured per F-7.

Auth flows through a short-lived single-use ticket issued by
`POST /judge/submissions/{id}/ticket` (EventSource cannot set an Authorization header).
At issuance the route verifies authentication + submission ownership + tenant scope;
at stream open the route re-verifies the submission against the ticket's user, so an SSE
URL can never subscribe to another user's submission and a replayed ticket is rejected.

The stream only ever says "result ready" — it never carries verdicts, outputs, or hidden
test data; the client must refetch `GET /judge/submissions/{id}` for authoritative state.
"""

import asyncio
import json
import uuid
from collections.abc import AsyncGenerator
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from judge.realtime.tickets import judge_sse_tickets
from judge.services.submission import SubmissionService
from platform_core.core.constants import SSE_HEARTBEAT_INTERVAL_SECONDS
from platform_core.core.db.session import get_session
from platform_core.core.deps import RedisClient
from platform_core.core.exceptions import NotAuthenticated, ResourceNotFound, TokenInvalidError
from platform_core.core.repositories.user import UserRepository

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/judge", tags=["judge"])

JUDGE_SSE_CHANNEL_PREFIX = "zapsters:sse:judge:"

SSE_RESPONSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}

DbSession = Annotated[AsyncSession, Depends(get_session)]


async def publish_judge_result(submission_id: uuid.UUID) -> None:
    """Best-effort "result ready" notification. Never authoritative; a lost notification
    only delays the client's refetch of the poll API."""
    from platform_core.core.redis import get_redis_client

    redis = get_redis_client()
    try:
        await redis.publish(
            f"{JUDGE_SSE_CHANNEL_PREFIX}{submission_id}",
            json.dumps({"type": "judge.result_ready", "submission_id": str(submission_id)}),
        )
    except Exception:  # noqa: BLE001 - notification must never fail the event pipeline
        logger.exception("sse publish judge.result_ready failed")


@router.get("/submissions/{submission_id}/stream")
async def judge_submission_stream(
    submission_id: uuid.UUID,
    redis: RedisClient,
    session: DbSession,
    ticket: str = Query(min_length=16, max_length=128),
) -> StreamingResponse:
    """Open the SSE stream for one owned submission, authenticated via single-use ticket.

    The ticket (issued by the authenticated ticket endpoint) is consumed atomically and maps
    to the submitting user; the submission must belong to that user and their tenant, so an
    arbitrary submission id or another user's ticket yields 401/404.
    """
    user_id = await judge_sse_tickets.consume(redis, ticket)
    if user_id is None:
        raise NotAuthenticated()
    try:
        parsed_user_id = uuid.UUID(user_id)
    except (ValueError, TypeError) as exc:
        raise TokenInvalidError() from exc

    # Re-verify ownership + tenant at stream open (F-5/F-6/F-7). Foreign submissions are
    # indistinguishable from missing ones — 404, no existence oracle.
    user = await UserRepository(session).get_by_id(parsed_user_id)
    if user is None or not user.is_active:
        raise NotAuthenticated()

    owned = await SubmissionService(session).get_owned_row(submission_id, user=user)
    if owned is None:
        raise ResourceNotFound("Submission not found")

    async def event_generator() -> AsyncGenerator[str, None]:
        yield "event: connected\ndata: {\"type\":\"connected\"}\n\n"
        pubsub = redis.pubsub()
        channel = f"{JUDGE_SSE_CHANNEL_PREFIX}{submission_id}"
        await pubsub.subscribe(channel)
        try:
            while True:
                try:
                    message = await asyncio.wait_for(
                        pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0),
                        timeout=SSE_HEARTBEAT_INTERVAL_SECONDS,
                    )
                    if message and message["type"] == "message":
                        data = message["data"]
                        if isinstance(data, (bytes, bytearray)):
                            data = data.decode("utf-8", errors="replace")
                        yield f"event: result_ready\ndata: {data}\n\n"
                        break  # notification-only: stop once the result is ready
                except TimeoutError:
                    yield ": ping\n\n"
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.aclose()  # type: ignore[attr-defined]
            except Exception:  # noqa: BLE001
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=SSE_RESPONSE_HEADERS,
    )
