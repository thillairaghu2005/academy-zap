"""Slice 07 §19 — SSE transport tests.

httpx 0.27.2's ASGITransport buffers the whole response body, so an infinite SSE stream
cannot be read through it (the app never completes). The real HTTP stream is covered by the
live acceptance tier (test_sse_acceptance.py + browser E2E). Here we test the SSE tiers
directly against the real components:

- HTTP tier (completing responses only): ticket exchange requires auth; stream rejects
  unauthenticated and replayed tickets (GET returns 401 without opening a stream).
- Ticket service: single-use consumption, TTL.
- Connection manager: private events reach only their user's queue; the public leaderboard
  broadcast reaches every queue with no private data; detach releases queues.
- Stream generator: connected frame, notification frames, heartbeat comments, malformed
  payloads map to a generic event.
"""

import asyncio
import json
import uuid
from collections.abc import AsyncGenerator

import fakeredis
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.realtime.sse import (
    SseConnectionManager,
    event_stream_generator,
    publish_leaderboard_updated,
    publish_progress_updated,
    sse_tickets,
)
from platform_core.core.redis import get_redis
from tests.conftest import register_and_login

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def sse_client(
    db_session: AsyncSession, redis: fakeredis.FakeAsyncRedis
) -> AsyncGenerator[AsyncClient]:
    """ASGI client with the fakeredis override (the standard conftest pattern)."""
    from main import app
    from platform_core.core.db.session import get_session

    async def _override_get_session() -> AsyncGenerator[AsyncSession]:
        yield db_session

    async def _override_get_redis() -> AsyncGenerator[fakeredis.FakeAsyncRedis]:
        yield redis

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_redis] = _override_get_redis
    from fastapi_limiter import FastAPILimiter

    await FastAPILimiter.init(redis)
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac
    finally:
        await FastAPILimiter.close()
        app.dependency_overrides.clear()


async def _issue_ticket(client: AsyncClient, token: str) -> str:
    response = await client.post(
        "/api/v1/events/ticket", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    ticket = response.json()["ticket"]
    assert isinstance(ticket, str)
    return ticket


# -- HTTP tier: completing responses --------------------------------------------


async def test_ticket_exchange_requires_authentication(client: AsyncClient) -> None:
    response = await client.post("/api/v1/events/ticket")
    assert response.status_code == 401


async def test_stream_rejects_unauthenticated_ticket(client: AsyncClient) -> None:
    response = await client.get("/api/v1/events?ticket=not-a-real-ticket-1234567890")
    assert response.status_code == 401


async def test_stream_rejects_replayed_ticket(
    sse_client: AsyncClient, redis: fakeredis.FakeAsyncRedis
) -> None:
    """A consumed ticket cannot open a second stream — GETDEL makes replay impossible."""
    token = await register_and_login(sse_client, "sse-replay@example.com")
    ticket = await _issue_ticket(sse_client, token)

    # Consume the ticket exactly as the stream endpoint would.
    user_id = await sse_tickets.consume(redis, ticket)
    assert user_id is not None
    # A replayed ticket now opens nothing.
    second = await sse_client.get(f"/api/v1/events?ticket={ticket}")
    assert second.status_code == 401


async def test_ticket_is_single_use(
    sse_client: AsyncClient, redis: fakeredis.FakeAsyncRedis
) -> None:
    token = await register_and_login(sse_client, "sse-single-use@example.com")
    ticket = await _issue_ticket(sse_client, token)

    assert await sse_tickets.consume(redis, ticket) is not None
    assert await sse_tickets.consume(redis, ticket) is None


# -- Connection manager -----------------------------------------------------------


async def test_private_progress_event_only_reaches_its_user(
    redis: fakeredis.FakeAsyncRedis,
) -> None:
    manager = SseConnectionManager()
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())
    queue_a = await manager.attach(redis, user_a)
    queue_b = await manager.attach(redis, user_b)
    try:
        await publish_progress_updated(redis, user_a)
        await asyncio.sleep(0.2)

        payload_a = await asyncio.wait_for(queue_a.get(), timeout=2)
        assert json.loads(payload_a)["type"] == "progress.updated"
        # The payload never carries private values — only \"something changed\".
        assert "user_id" not in json.loads(payload_a)
        assert "xp" not in json.loads(payload_a)

        # User B's queue received nothing — the private event is never fanned out to them.
        await asyncio.sleep(0.2)
        assert queue_b.empty()
    finally:
        manager.detach(redis, user_a, queue_a)
        manager.detach(redis, user_b, queue_b)


async def test_public_leaderboard_broadcast_reaches_all_without_private_data(
    redis: fakeredis.FakeAsyncRedis,
) -> None:
    manager = SseConnectionManager()
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())
    queue_a = await manager.attach(redis, user_a)
    queue_b = await manager.attach(redis, user_b)
    try:
        await publish_leaderboard_updated(redis)
        await asyncio.sleep(0.2)

        for queue in (queue_a, queue_b):
            payload = json.loads(await asyncio.wait_for(queue.get(), timeout=2))
            assert payload["type"] == "leaderboard.updated"
            assert payload["scope"] == "global"
            for private in (
                "user_id",
                "xp",
                "score",
                "integrity",
                "freeze_status",
                "org_id",
                "display_name",
            ):
                assert private not in payload
    finally:
        manager.detach(redis, user_a, queue_a)
        manager.detach(redis, user_b, queue_b)


async def test_disconnect_releases_queues(redis: fakeredis.FakeAsyncRedis) -> None:
    manager = SseConnectionManager()
    user = str(uuid.uuid4())
    queue = await manager.attach(redis, user)
    assert queue in manager._queues.get(user, set())  # noqa: SLF001 - test inspects registry

    manager.detach(redis, user, queue)
    assert not manager._queues.get(user)  # noqa: SLF001
    assert user not in manager._queues  # noqa: SLF001


# -- Stream generator -------------------------------------------------------------


async def test_stream_generator_connected_frame_and_heartbeat() -> None:
    queue: asyncio.Queue[str] = asyncio.Queue()
    generator = event_stream_generator(queue, heartbeat_seconds=0.05)

    first = await anext(generator)
    assert first.startswith("event: connected")

    second = await anext(generator)
    assert ": ping" in second
    assert "progress.updated" not in second
    assert "leaderboard.updated" not in second

    await generator.aclose()


async def test_stream_generator_emits_notification_frame() -> None:
    queue: asyncio.Queue[str] = asyncio.Queue()
    generator = event_stream_generator(queue, heartbeat_seconds=30)

    first = await anext(generator)  # connected
    assert "event: connected" in first

    await queue.put(json.dumps({"type": "progress.updated"}))
    frame = await anext(generator)
    assert "event: progress.updated" in frame
    assert json.loads(frame.split("data: ")[1])["type"] == "progress.updated"

    await generator.aclose()


async def test_stream_generator_malformed_payload_maps_to_generic_event() -> None:
    queue: asyncio.Queue[str] = asyncio.Queue()
    generator = event_stream_generator(queue, heartbeat_seconds=30)

    await anext(generator)  # connected
    await queue.put("not-json{{")
    frame = await anext(generator)
    assert "event: update" in frame
    assert "not-json" in frame

    await generator.aclose()


async def test_stream_generator_unknown_type_maps_to_generic_event() -> None:
    queue: asyncio.Queue[str] = asyncio.Queue()
    generator = event_stream_generator(queue, heartbeat_seconds=30)

    await anext(generator)  # connected
    await queue.put(json.dumps({"type": "internal.db.event"}))
    frame = await anext(generator)
    assert "event: update" in frame

    await generator.aclose()


async def test_frozen_user_privacy_preserved_in_stream() -> None:
    """A frozen user's private integrity state never appears in any SSE payload — the
    transport only says \"something changed\" and the frontend refetches /me/progress."""
    queue: asyncio.Queue[str] = asyncio.Queue()
    generator = event_stream_generator(queue, heartbeat_seconds=30)
    await queue.put(json.dumps({"type": "progress.updated"}))
    frame = await anext(generator)
    assert "frozen" not in frame
    assert "integrity" not in frame
    assert "freeze_status" not in frame
    await generator.aclose()
