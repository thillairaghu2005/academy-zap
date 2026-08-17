"""Slice 06 §19 — leaderboard consistency acceptance, executed against REAL infrastructure.

Real Redis Streams -> the real arq worker (`poll_gamification_events`) -> Integrity Gate ->
hash-chained XP ledger -> ProgressContext -> leaderboard projection (real Redis ZSET) -> the
read API. No mocks for the pipeline itself; only the worker's session/redis wiring is
redirected to the test Postgres/Redis, exactly as the app's dependency overrides do for the
HTTP tier (same pattern as test_gamification_acceptance.py).
"""

import uuid
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis

from assessments.models import Assessment, Question
from content.models import Course, Enrollment
from gamification.projections.leaderboard import LeaderboardProjection
from gamification.repositories.ledger import LedgerRepository
from platform_core.bus.producer import publish
from platform_core.bus.worker import poll_gamification_events
from platform_core.core.config import settings
from platform_core.core.db.session import get_session
from platform_core.core.redis import get_redis
from platform_core.events.schema import AssessmentSubmittedEvent
from tests.conftest import register_and_login

ASSESSMENT_MAX_MASTERY_XP = 500


@pytest_asyncio.fixture
async def real_client(
    db_session: AsyncSession,
) -> AsyncGenerator[tuple[AsyncClient, AsyncRedis]]:
    """ASGI client + real Redis (same override pattern as the slice-04 acceptance fixture)."""
    real_redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def _override_get_session() -> AsyncGenerator[AsyncSession]:
        yield db_session

    async def _override_get_redis() -> AsyncGenerator[AsyncRedis]:
        yield real_redis

    from fastapi_limiter import FastAPILimiter

    from main import app

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_redis] = _override_get_redis
    # The real Redis ZSET is a shared key across tests — start each test from a clean board so
    # totals are exact (the projection itself is rebuilt from authoritative state, never read
    # back as a source of truth).
    from platform_core.bus.producer import EVENTS_STREAM_KEY
    from platform_core.core.constants import LEADERBOARD_KEY_PREFIX

    keys = [
        f"{LEADERBOARD_KEY_PREFIX}global",
        f"{LEADERBOARD_KEY_PREFIX}global:meta",
    ]
    await real_redis.delete(*keys)
    # This acceptance suite publishes real events to the shared stream; a stale backlog would
    # pollute the slice-04 probe consumer's batch (it reads `count=10` and asserts its own
    # event is among them). Each test starts and ends with a clean stream so the suites can
    # run in any order.
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


async def _seed_assessment_for_user(
    db_session: AsyncSession, *, user_id: uuid.UUID
) -> tuple[uuid.UUID, list[uuid.UUID]]:
    """One published course + one easy MCQ assessment + enrollment for the given user."""
    course = Course(
        id=uuid.uuid4(),
        title="Leaderboard Acceptance Host",
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
        slug=f"lb-acceptance-{uuid.uuid4().hex[:8]}",
        title="Leaderboard Acceptance Assessment",
        category="web_development",
        description="Single easy MCQ.",
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


async def _drain_until_leaderboard_members(
    *,
    expected: int,
    db_session: AsyncSession,
    redis: AsyncRedis,
    monkeypatch: pytest.MonkeyPatch,
    max_polls: int = 25,
) -> int:
    """Run the real worker until the real ZSET has at least `expected` members (bounded).

    The worker's `session_scope` is pointed at the SAME `db_session` the API registered the
    users through — the fixture's SAVEPOINT isolation means a fresh engine connection cannot
    see the not-yet-committed user rows (a test-harness artifact; in production the worker and
    API share one committed database). Sharing the session keeps the worker on the current
    test's loop and connection, exactly like the app's dependency overrides do for HTTP.
    """
    from contextlib import asynccontextmanager

    import platform_core.bus.worker as worker_module

    @asynccontextmanager
    async def _test_session_scope() -> AsyncGenerator[AsyncSession]:
        yield db_session

    monkeypatch.setattr(worker_module, "get_redis_client", lambda: redis)
    monkeypatch.setattr(worker_module, "session_scope", _test_session_scope)

    from tests.conftest import drain_outbox_for_test

    for _ in range(max_polls):
        await drain_outbox_for_test(db_session, redis)
        await worker_module.poll_gamification_events({})
        projection = LeaderboardProjection(redis)
        page = await projection.page(offset=0, limit=1)
        total = int(page["total"])
        if total >= expected:
            return total
    return total


async def _complete_assessment(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    assessment_id: uuid.UUID,
    question_ids: list[uuid.UUID],
) -> str:
    """Answer + finalize one attempt; returns the attempt_id (the finalization's
    idempotency key is `assessment.submitted:{attempt_id}`)."""
    started = await client.post(
        f"/api/v1/assessments/{assessment_id}/attempts", headers=headers
    )
    assert started.status_code == 201
    attempt_id: str = started.json()["attempt_id"]
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
    return attempt_id


@pytest.mark.asyncio
async def test_leaderboard_consistency_acceptance(
    real_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Phase 19 scenario, executed against real Redis + real Postgres + the real worker:
    two users earn real XP -> worker updates the real ZSET -> API ordering/scores/positions ->
    tie -> replay (no change) -> User A's XP increases -> position changes -> my position
    matches the board."""
    client, real_redis = real_client

    token_a = await register_and_login(client, "lb-a@example.com")
    token_b = await register_and_login(client, "lb-b@example.com")
    me_a = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    me_b = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_b}"})
    user_a = uuid.UUID(me_a.json()["id"])
    user_b = uuid.UUID(me_b.json()["id"])
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1-6. Real activity for both users -> real events -> real worker -> real projection.
    aid_a, qids_a = await _seed_assessment_for_user(db_session, user_id=user_a)
    aid_b, qids_b = await _seed_assessment_for_user(db_session, user_id=user_b)
    attempt_a = await _complete_assessment(
        client, headers_a, assessment_id=aid_a, question_ids=qids_a
    )
    await _complete_assessment(client, headers_b, assessment_id=aid_b, question_ids=qids_b)

    total = await _drain_until_leaderboard_members(
        expected=2, db_session=db_session, redis=real_redis, monkeypatch=monkeypatch
    )
    assert total == 2

    # 7-11. Both users scored the same (100% mastery) -> tie -> deterministic ordering.
    board = await client.get("/api/v1/leaderboards/global")
    assert board.status_code == 200
    body = board.json()
    assert body["total"] == 2
    scores = {e["user_id"]: e["score"] for e in body["entries"]}
    assert scores[str(user_a)] == ASSESSMENT_MAX_MASTERY_XP * 0.6  # 0.6 * 500
    assert scores[str(user_b)] == ASSESSMENT_MAX_MASTERY_XP * 0.6
    # Tie: both entries present with dense ranks 1 and 2, deterministic member order.
    assert {e["rank"] for e in body["entries"]} == {1, 2}
    assert body["entries"][0]["display_name"] == "Test User"
    assert body["entries"][1]["display_name"] == "Test User"

    # 12-13. Replay one event (redelivery) -> board unchanged, ledger still 1 entry.
    entries_before = await LedgerRepository(db_session).list_for_user(user_a)
    assert len(entries_before) == 1
    # Redeliver the EXACT same event (same idempotency key as the original finalization).
    await publish(
        AssessmentSubmittedEvent(
            user_id=user_a,
            org_id=None,
            idempotency_key=f"assessment.submitted:{attempt_a}",
            session_fingerprint=f"auth:{user_a}",
            assessment_id=aid_a,
            assessment_kind="main",
            score_pct=100.0,
            max_score=10.0,
            time_taken_seconds=60,
            attempt_number=1,
            question_level_answers=[
                {
                    "question_id": str(qids_a[0]),
                    "option_index": 1,
                    "time_spent_ms": 2_000,
                    "correct": True,
                    "score": 10,
                    "submitted_at": "2026-01-01T00:00:00+00:00",
                }
            ],
        ),
        real_redis,
    )
    await _drain_until_leaderboard_members(
        expected=2, db_session=db_session, redis=real_redis, monkeypatch=monkeypatch
    )
    entries_after = await LedgerRepository(db_session).list_for_user(user_a)
    assert len(entries_after) == 1  # idempotency: same event_id family not re-appended
    board_after = (await client.get("/api/v1/leaderboards/global")).json()
    assert board_after["total"] == 2
    assert {e["user_id"]: e["score"] for e in board_after["entries"]} == scores

    # 14-16. User A earns MORE XP (a second, distinct assessment) -> position stays #1 or
    # improves its score — User B unchanged.
    aid_a2, qids_a2 = await _seed_assessment_for_user(db_session, user_id=user_a)
    await _complete_assessment(client, headers_a, assessment_id=aid_a2, question_ids=qids_a2)
    await _drain_until_leaderboard_members(
        expected=2, db_session=db_session, redis=real_redis, monkeypatch=monkeypatch
    )
    board_grown = (await client.get("/api/v1/leaderboards/global")).json()
    grown_scores = {e["user_id"]: e["score"] for e in board_grown["entries"]}
    assert grown_scores[str(user_a)] == ASSESSMENT_MAX_MASTERY_XP * 0.6 * 2
    assert grown_scores[str(user_b)] == ASSESSMENT_MAX_MASTERY_XP * 0.6
    assert board_grown["entries"][0]["user_id"] == str(user_a)  # A now #1 outright

    # 17-18. My position matches the board.
    my_a = await client.get("/api/v1/leaderboards/global/me", headers=headers_a)
    assert my_a.status_code == 200
    assert my_a.json()["rank"] == 1
    assert my_a.json()["score"] == ASSESSMENT_MAX_MASTERY_XP * 0.6 * 2
    board_first = board_grown["entries"][0]
    assert board_first["user_id"] == my_a.json()["user_id"]
    assert board_first["score"] == my_a.json()["score"]

    # Ledger remains the authoritative source: hash chain valid end to end.
    await LedgerRepository(db_session).verify_chain_for_user(user_a)
    await LedgerRepository(db_session).verify_chain_for_user(user_b)


@pytest.mark.asyncio
async def test_flagged_event_hides_user_from_the_board(
    real_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Slice 06 §12 — frozen policy enforced server-side: a flagged event still accrues private
    XP but the user vanishes from the public board until the projection re-adds them."""
    client, real_redis = real_client
    token = await register_and_login(client, "lb-flagged@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    user_id = uuid.UUID(
        (await client.get("/api/v1/auth/me", headers=headers)).json()["id"]
    )
    aid, qids = await _seed_assessment_for_user(db_session, user_id=user_id)
    await _complete_assessment(client, headers, assessment_id=aid, question_ids=qids)

    total = await _drain_until_leaderboard_members(
        expected=1, db_session=db_session, redis=real_redis, monkeypatch=monkeypatch
    )
    assert total == 1
    board = (await client.get("/api/v1/leaderboards/global")).json()
    assert board["entries"][0]["user_id"] == str(user_id)

    # Flag the user's ledger entry directly (simulates an Integrity Gate flag), then resolve +
    # projection-update: the user must disappear from the board while XP stays in the ledger.
    from gamification.models import LedgerEntry

    entry = (await LedgerRepository(db_session).list_for_user(user_id))[0]
    await db_session.execute(
        update(LedgerEntry).where(LedgerEntry.id == entry.id).values(integrity_status="flagged")
    )
    await db_session.commit()

    from gamification.context.resolver import ProgressContextResolver

    context = await ProgressContextResolver(db_session).resolve(user_id)
    assert context.rank.mastery_xp == ASSESSMENT_MAX_MASTERY_XP  # private XP intact
    assert context.freeze_status == "frozen_pending_review"
    await LeaderboardProjection(real_redis).update_user(context, display_name="Test User")

    board_after = (await client.get("/api/v1/leaderboards/global")).json()
    assert board_after["total"] == 0
    my_pos = await client.get("/api/v1/leaderboards/global/me", headers=headers)
    assert my_pos.status_code == 200
    assert my_pos.json() is None
