"""Slice 07 §20 — real-pipeline SSE acceptance.

Runs the REAL chain against REAL infrastructure: real Redis (pub/sub) + real Postgres +
the real worker (`poll_gamification_events`). The scenario proves the slice's core principle:

    authoritative state change -> SSE notification -> query invalidation -> authoritative refetch

Concretely:
1. Register user, enroll in a published course, complete an assessment (real API calls).
2. The finalization publishes `assessment.submitted` onto the real Redis stream.
3. The real worker drains the stream, appends a hash-chained ledger entry, resolves the
   ProgressContext, updates the leaderboard projection, and publishes `progress.updated` +
   `leaderboard.updated` onto the real pub/sub channels (slice 07 worker hook).
4. A client attached through the REAL `SseConnectionManager` receives both notifications
   (their private `progress.updated` + the public `leaderboard.updated` broadcast).
5. The notifications carry NO authoritative values — the client would refetch the APIs.

The HTTP stream itself is covered by the live browser E2E (httpx ASGITransport buffers
infinite bodies); this tier verifies the worker -> pub/sub -> connection-manager fan-out on
real infrastructure.
"""

import asyncio
import json
import uuid
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis

from assessments.models import Assessment, Question
from content.models import Course, Enrollment
from gamification.realtime.sse import SseConnectionManager
from platform_core.bus.producer import EVENTS_STREAM_KEY
from platform_core.core.config import settings
from platform_core.core.db.session import get_session
from platform_core.core.redis import get_redis
from tests.conftest import register_and_login

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def real_client(
    db_session: AsyncSession,
) -> AsyncGenerator[tuple[AsyncClient, AsyncRedis]]:
    """ASGI client + real Redis (same override pattern as the slice-04/06 acceptance)."""
    real_redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def _override_get_session() -> AsyncGenerator[AsyncSession]:
        yield db_session

    async def _override_get_redis() -> AsyncGenerator[AsyncRedis]:
        yield real_redis

    from fastapi_limiter import FastAPILimiter

    from main import app

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_redis] = _override_get_redis
    # Clean slate for this test's stream so the acceptance is deterministic.
    await real_redis.delete(EVENTS_STREAM_KEY)
    await FastAPILimiter.init(real_redis, prefix=f"fastapi-limiter-{uuid.uuid4().hex}")
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac, real_redis
    finally:
        await FastAPILimiter.close()
        app.dependency_overrides.clear()
        await real_redis.delete(EVENTS_STREAM_KEY)
        await real_redis.close()


async def _seed_course_and_assessment(
    db_session: AsyncSession, *, user_id: uuid.UUID
) -> tuple[uuid.UUID, list[uuid.UUID]]:
    """Published course + enrollment + single-easy-question published assessment (10 pts)."""
    course = Course(
        id=uuid.uuid4(),
        title="SSE Acceptance Host Course",
        category="web_development",
        level="beginner",
        status="published",
        instructor_user_id=uuid.uuid4(),
    )
    db_session.add(course)
    await db_session.flush()
    db_session.add(Enrollment(course_id=course.id, user_id=user_id))
    assessment = Assessment(
        id=uuid.uuid4(),
        slug=f"sse-acceptance-{uuid.uuid4().hex[:8]}",
        title="SSE Acceptance Assessment",
        category="web_development",
        description="Single easy MCQ — deterministic 10/10 mastery.",
        attempts_allowed=3,
        estimated_minutes=30,
        passing_percent=50,
        course_id=course.id,
        status="published",
    )
    question = Question(
        id=uuid.uuid4(),
        assessment_id=assessment.id,
        type="mcq",
        difficulty="easy",
        prompt="Pick the first option.",
        options=["Wrong", "Correct"],
        accepted_answers=["1"],
        position=0,
    )
    assessment.questions = [question]
    db_session.add(assessment)
    await db_session.commit()
    return assessment.id, [question.id]


async def _drain_until_notifications(
    *,
    redis: AsyncRedis,
    user_id: str,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    max_polls: int = 25,
) -> None:
    """Run the real worker until the user's channel has been published to (bounded)."""
    from contextlib import asynccontextmanager

    import platform_core.bus.worker as worker_module

    @asynccontextmanager
    async def _test_session_scope() -> AsyncGenerator[AsyncSession]:
        yield db_session

    monkeypatch.setattr(worker_module, "session_scope", _test_session_scope)
    monkeypatch.setattr(worker_module, "get_redis_client", lambda: redis)

    pubsub = redis.pubsub()
    await pubsub.psubscribe("zapsters:sse:user:*")
    seen: list[dict[str, object]] = []

    from tests.conftest import drain_outbox_for_test
    try:
        for _ in range(max_polls):
            await drain_outbox_for_test(db_session, redis)
            await worker_module.poll_gamification_events({})
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
                if message is None:
                    break
                if message.get("type") != "pmessage":
                    continue
                channel = str(message.get("channel", ""))
                if channel == f"zapsters:sse:user:{user_id}":
                    seen.append(json.loads(str(message.get("data"))))
            if any(m.get("type") == "progress.updated" for m in seen):
                break
    finally:
        await pubsub.punsubscribe("zapsters:sse:user:*")
        await pubsub.aclose()  # type: ignore[attr-defined]

    assert any(m.get("type") == "progress.updated" for m in seen), (
        f"worker never published progress.updated for {user_id}: {seen}"
    )


async def test_worker_publishes_sse_notifications_on_real_pipeline(
    real_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The real worker emits progress.updated + leaderboard.updated after processing a real
    assessment completion, and the real connection manager delivers both to an attached client
    — private progression only to its owner, public board broadcast to everyone."""
    client, real_redis = real_client
    access_token = await register_and_login(client, "sse-acceptance@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}
    me = await client.get("/api/v1/auth/me", headers=headers)
    user_id = uuid.UUID(me.json()["id"])

    assessment_id, question_ids = await _seed_course_and_assessment(
        db_session, user_id=user_id
    )

    started = await client.post(
        f"/api/v1/assessments/{assessment_id}/attempts", headers=headers
    )
    assert started.status_code == 201
    attempt_id = started.json()["attempt_id"]
    answered = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit",
        headers=headers,
        json={"question_id": str(question_ids[0]), "option_index": 1, "time_spent_ms": 2_000},
    )
    assert answered.status_code == 200
    final = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit-final", headers=headers
    )
    assert final.status_code == 200

    # Attach BOTH real connection-manager clients BEFORE draining so neither misses an event:
    # the owner (private progression) and an unrelated user (public board broadcast).
    manager = SseConnectionManager()
    queue = await manager.attach(real_redis, str(user_id))
    other_user = str(uuid.uuid4())
    queue_b = await manager.attach(real_redis, other_user)

    try:
        await _drain_until_notifications(
            redis=real_redis,
            user_id=str(user_id),
            db_session=db_session,
            monkeypatch=monkeypatch,
        )
        await asyncio.sleep(0.3)

        # The owner receives its own private progression notification.
        personal = json.loads(await asyncio.wait_for(queue.get(), timeout=3))
        assert personal["type"] == "progress.updated"
        # No authoritative values ride the notification.
        for private in ("xp", "rank", "streak", "score", "freeze_status", "user_id"):
            assert private not in personal

        # The unrelated user receives the public leaderboard broadcast (but NOT the owner's
        # private progression — the private event is never fanned out to them).
        board = json.loads(await asyncio.wait_for(queue_b.get(), timeout=3))
        assert board["type"] == "leaderboard.updated"
        assert board["scope"] == "global"
        for private in (
            "user_id",
            "xp",
            "score",
            "integrity",
            "freeze_status",
            "org_id",
            "display_name",
        ):
            assert private not in board
        await asyncio.sleep(0.2)
        assert queue_b.empty()  # no private progression leaked to the unrelated user
    finally:
        manager.detach(real_redis, str(user_id), queue)
        manager.detach(real_redis, other_user, queue_b)
        await manager.stop()
