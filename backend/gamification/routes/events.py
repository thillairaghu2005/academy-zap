"""Slice 07 — SSE notification transport endpoints (gamification §2.3, §5.4).

- `POST /events/ticket`  — authenticated exchange of the access token for a short-lived
  single-use SSE ticket (EventSource cannot set headers; the refresh cookie is path-scoped to
  /api/v1/auth). Requires the normal `Authorization: Bearer` header, so the ticket is the only
  credential that ever appears in a URL, and only for ~30s.
- `GET /events`           — the EventSource stream. Consumes the ticket (single-use), attaches
  to the fan-out hub for the authenticated user, sends heartbeats, and serves only the events
  that user is authorized for (their own `progress.updated` + the public `leaderboard.updated`
  broadcast). The stream NEVER carries authoritative values — only \"something changed\".

Connection lifecycle: the async generator's `finally` detaches the queue on client
disconnect/cancel, and the hub stops its Redis listener when the last client for that redis
leaves. Heartbeat is a timeout race with the queue (no per-connection timer task).
"""

import uuid
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from gamification.realtime.sse import (
    event_stream_generator,
    heartbeat_interval_seconds,
    sse_manager,
    sse_tickets,
)
from platform_core.core.deps import CurrentUser, DbSession, RedisClient
from platform_core.core.exceptions import NotAuthenticated, TokenInvalidError
from platform_core.core.repositories.user import UserRepository

router = APIRouter(tags=["gamification"])

SSE_RESPONSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


@router.post("/events/ticket")
async def create_sse_ticket(
    redis: RedisClient,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """Exchange the caller's access token for a short-lived single-use SSE ticket.

    The ticket is stored in Redis keyed with a 30s TTL and deleted on first use — it is never
    the access token itself, so a leak of an SSE URL cannot be replayed into the API.
    """
    ticket = await sse_tickets.issue(redis, str(current_user.id))
    return {"ticket": ticket, "expires_in": 30}


@router.get("/events")
async def stream_events(
    redis: RedisClient,
    session: DbSession,
    ticket: str = Query(min_length=16, max_length=128),
) -> StreamingResponse:
    """Open the authenticated user's SSE stream.

    Auth flows through the single-use ticket (issued by /events/ticket) because EventSource
    cannot set an Authorization header. Unauthenticated/replayed tickets are rejected before
    any event data is sent.
    """
    user_id = await sse_tickets.consume(redis, ticket)
    if user_id is None:
        raise NotAuthenticated()
    try:
        parsed_user_id = uuid.UUID(user_id)
    except (ValueError, TypeError) as exc:
        raise TokenInvalidError() from exc

    user = await UserRepository(session).get_by_id(parsed_user_id)
    if user is None or not user.is_active:
        raise NotAuthenticated()

    queue = await sse_manager.attach(redis, user_id)

    async def _event_stream() -> AsyncGenerator[str, None]:
        try:
            async for frame in event_stream_generator(queue, heartbeat_interval_seconds()):
                yield frame
        finally:
            sse_manager.detach(redis, user_id, queue)

    return StreamingResponse(
        _event_stream(),
        media_type="text/event-stream",
        headers=SSE_RESPONSE_HEADERS,
    )
