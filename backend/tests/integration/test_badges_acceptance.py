"""Slice 08 acceptance tier — the REAL pipeline, end to end (Phase 20/23).

course.completed / assessment.submitted -> real Redis Streams -> the real arq worker
function (`poll_gamification_events`) -> idempotency marker -> Integrity Gate -> ledger ->
ProgressContext -> badge evaluation -> signed credential. Redis is the real server,
Postgres is the real throwaway database. Replay, concurrency, flagged-credential, and
API-read semantics are asserted against the authoritative tables.

The API tier reuses the same `real_redis_client` fixture pattern as
`test_gamification_acceptance.py` so the badge read endpoints run against the test DB/Redis
with real tokens.
"""

import asyncio
import uuid
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

if TYPE_CHECKING:
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis

from gamification.repositories.badges import (
    CredentialRepository,
    UserBadgeRepository,
)
from gamification.repositories.ledger import LedgerRepository
from platform_core.bus.producer import publish
from platform_core.bus.worker import poll_gamification_events
from platform_core.core.config import settings
from platform_core.core.db.session import get_session
from platform_core.core.redis import get_redis
from platform_core.events.schema import AssessmentSubmittedEvent, CourseCompletedEvent
from tests.conftest import register_and_login


@pytest_asyncio.fixture
async def real_redis_client(
    db_session: AsyncSession,
) -> AsyncGenerator[tuple[AsyncClient, AsyncRedis]]:
    """ASGI client with test session/Redis overrides, backed by the real Redis server."""
    real_redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def _override_get_session() -> AsyncGenerator[AsyncSession]:
        yield db_session

    async def _override_get_redis() -> AsyncGenerator[AsyncRedis]:
        yield real_redis

    from fastapi_limiter import FastAPILimiter

    from main import app

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_redis] = _override_get_redis
    await FastAPILimiter.init(real_redis, prefix=f"fastapi-limiter-badges-{uuid.uuid4().hex}")
    from platform_core.bus.producer import EVENTS_STREAM_KEY

    await real_redis.delete(EVENTS_STREAM_KEY)
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac, real_redis
    finally:
        await FastAPILimiter.close()
        app.dependency_overrides.clear()
        await real_redis.delete(EVENTS_STREAM_KEY)
        await real_redis.close()


def _course_event(
    *, user_id: uuid.UUID, key: str | None = None
) -> CourseCompletedEvent:
    return CourseCompletedEvent(
        user_id=user_id,
        idempotency_key=key or f"course.completed:{uuid.uuid4()}",
        session_fingerprint=f"auth:{user_id}",
        course_id=uuid.uuid4(),
        category="web_development",
        time_spent_seconds=3_600,
        payload={"content_duration_seconds": 3_600},
    )


def _assessment_event(
    *, user_id: uuid.UUID, score_pct: float, fast: bool = False
) -> AssessmentSubmittedEvent:
    return AssessmentSubmittedEvent(
        user_id=user_id,
        idempotency_key=f"assessment.submitted:{uuid.uuid4()}",
        session_fingerprint=f"auth:{user_id}",
        assessment_id=uuid.uuid4(),
        assessment_kind="main",
        score_pct=score_pct,
        max_score=10.0,
        time_taken_seconds=60,
        attempt_number=1,
        question_level_answers=[
            {
                "question_id": str(uuid.uuid4()),
                "option_index": 0,
                "time_spent_ms": 500 if fast else 2_000,
            }
            for _ in range(10)
        ],
    )


async def _drain_until_badge(
    *,
    user_id: uuid.UUID,
    badge_id: str,
    db_session: AsyncSession,
    redis: AsyncRedis,
    monkeypatch: pytest.MonkeyPatch,
    max_polls: int = 25,
) -> bool:
    """Run the real worker until the user's award row for `badge_id` exists (bounded).

    The worker's `session_scope` is pointed at the SAME `db_session` the API registered the
    user through — the fixture's SAVEPOINT isolation means a fresh engine connection cannot
    see the not-yet-committed user row (a test-harness artifact; in production the worker and
    API share one committed database). Sharing the session keeps the worker on the current
    test's loop and connection, exactly like the app's dependency overrides do for HTTP and
    like `test_leaderboard_acceptance.py` does for the projection.
    """
    from contextlib import asynccontextmanager

    import platform_core.bus.worker as worker_module

    @asynccontextmanager
    async def _test_session_scope() -> AsyncGenerator[AsyncSession]:
        yield db_session

    monkeypatch.setattr(worker_module, "get_redis_client", lambda: redis)
    monkeypatch.setattr(worker_module, "session_scope", _test_session_scope)

    for _ in range(max_polls):
        await poll_gamification_events({})
        if await UserBadgeRepository(db_session).has_award(user_id, badge_id):
            return True
    return False


# ---------------------------------------------------------------------------
# Course completion -> first-course badge -> signed credential -> APIs
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_course_completion_awards_badge_and_credential_end_to_end(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, real_redis = real_redis_client
    access_token = await register_and_login(client, "badges-course@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}
    me = await client.get("/api/v1/auth/me", headers=headers)
    user_id = uuid.UUID(me.json()["id"])

    event = _course_event(user_id=user_id)
    await publish(event, real_redis)

    awarded = await _drain_until_badge(
        user_id=user_id,
        badge_id="first_course_completed",
        db_session=db_session,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )
    assert awarded is True

    await db_session.commit()
    awards = await UserBadgeRepository(db_session).list_for_user(user_id)
    assert len(awards) == 1
    assert awards[0].badge_id == "first_course_completed"
    assert awards[0].source_event_id == event.event_id

    credentials = await CredentialRepository(db_session).list_for_user(user_id)
    assert len(credentials) == 1
    credential = credentials[0]
    assert credential.status == "verified"
    assert credential.claim["credentialSubject"]["achievement"] == "first_course_completed"
    assert credential.signature

    # The locked frontend contract via GET /me/badges.
    badges = await client.get("/api/v1/me/badges", headers=headers)
    assert badges.status_code == 200
    payload = badges.json()
    assert len(payload) == 1
    assert payload[0]["badge_id"] == "first_course_completed"
    assert payload[0]["name"] == "First Course Completed"
    assert payload[0]["status"] == "verified"
    assert payload[0]["credential_id"] == credential.public_id
    assert payload[0]["verify_url"] == f"/rank/verify/{credential.public_id}"

    # Public verify endpoint — the same contract the verify page renders.
    verify = await client.get(f"/api/v1/verify/{credential.public_id}")
    assert verify.status_code == 200
    verify_payload = verify.json()
    assert verify_payload["status"] == "verified"
    assert verify_payload["credential_id"] == credential.public_id
    assert verify_payload["badge_name"] == "First Course Completed"
    assert verify_payload["issuer"] == "Zapsters"
    assert verify_payload["subject"]["display_name"] == "Test User"
    assert verify_payload["claim"]["category"] == "learning"
    assert verify_payload["signature"] == credential.signature


@pytest.mark.asyncio
async def test_replayed_event_never_duplicates_award_or_credential(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Phase 20: the same event delivered twice -> exactly one badge, one credential, and
    XP/ProgressContext unchanged by the replay."""
    client, real_redis = real_redis_client
    access_token = await register_and_login(client, "badges-replay@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}
    me = await client.get("/api/v1/auth/me", headers=headers)
    user_id = uuid.UUID(me.json()["id"])

    event = _course_event(user_id=user_id)

    await publish(event, real_redis)
    assert await _drain_until_badge(
        user_id=user_id,
        badge_id="first_course_completed",
        db_session=db_session,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )

    # Replay the SAME event through the worker (idempotency marker path).
    await publish(event, real_redis)
    for _ in range(5):
        await poll_gamification_events({})

    await db_session.commit()
    assert len(await UserBadgeRepository(db_session).list_for_user(user_id)) == 1
    assert len(await CredentialRepository(db_session).list_for_user(user_id)) == 1
    entries = await LedgerRepository(db_session).list_for_user(user_id)
    assert len(entries) == 1  # no duplicate XP either

    badges = await client.get("/api/v1/me/badges", headers=headers)
    assert badges.status_code == 200
    assert len(badges.json()) == 1


@pytest.mark.asyncio
async def test_concurrent_duplicate_delivery_produces_one_award(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Phase 5/20: two worker processes racing on the same event -> exactly one award and
    one credential (DB unique constraint is the hard guarantee)."""
    client, real_redis = real_redis_client
    access_token = await register_and_login(client, "badges-race@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}
    me = await client.get("/api/v1/auth/me", headers=headers)
    user_id = uuid.UUID(me.json()["id"])

    event = _course_event(user_id=user_id)
    await publish(event, real_redis)

    from contextlib import asynccontextmanager

    from sqlalchemy.ext.asyncio import async_sessionmaker

    import platform_core.bus.worker as worker_module

    engine = create_async_engine(postgres_test_db)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    @asynccontextmanager
    async def _test_session_scope() -> AsyncGenerator[AsyncSession]:
        async with factory() as session:
            yield session

    monkeypatch.setattr(worker_module, "get_redis_client", lambda: real_redis)
    monkeypatch.setattr(worker_module, "session_scope", _test_session_scope)

    try:
        # Two consumers in the same group both claim pending messages concurrently.
        await asyncio.gather(poll_gamification_events({}), poll_gamification_events({}))
        for _ in range(5):
            await poll_gamification_events({})
    finally:
        await engine.dispose()

    await db_session.commit()
    assert len(await UserBadgeRepository(db_session).list_for_user(user_id)) == 1
    assert len(await CredentialRepository(db_session).list_for_user(user_id)) == 1


# ---------------------------------------------------------------------------
# Assessment triggers + state milestones + flagged credentials
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_perfect_score_awards_badge_and_low_score_does_not(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, real_redis = real_redis_client
    access_token = await register_and_login(client, "badges-assessment@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    user_id = uuid.UUID(me.json()["id"])

    # 90% — eligible for XP but NOT the perfect-score badge.
    await publish(_assessment_event(user_id=user_id, score_pct=90.0), real_redis)
    assert not await _drain_until_badge(
        user_id=user_id,
        badge_id="perfect_assessment",
        db_session=db_session,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )

    # 100% — badge awarded.
    await publish(_assessment_event(user_id=user_id, score_pct=100.0), real_redis)
    assert await _drain_until_badge(
        user_id=user_id,
        badge_id="perfect_assessment",
        db_session=db_session,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )

    await db_session.commit()
    awards = await UserBadgeRepository(db_session).list_for_user(user_id)
    assert [a.badge_id for a in awards] == ["perfect_assessment"]


@pytest.mark.asyncio
async def test_flagged_event_still_awards_but_credential_is_flagged(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """gamification §7.4: a flagged event still accrues private state (the badge is awarded),
    but the credential's public status is `flagged` (frozen pending review)."""
    client, real_redis = real_redis_client
    access_token = await register_and_login(client, "badges-flagged@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    user_id = uuid.UUID(me.json()["id"])

    # All answers suspiciously fast -> integrity gate flags the event.
    await publish(_assessment_event(user_id=user_id, score_pct=100.0, fast=True), real_redis)
    assert await _drain_until_badge(
        user_id=user_id,
        badge_id="perfect_assessment",
        db_session=db_session,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )

    await db_session.commit()
    credentials = await CredentialRepository(db_session).list_for_user(user_id)
    assert len(credentials) == 1
    assert credentials[0].status == "flagged"

    verify = await client.get(f"/api/v1/verify/{credentials[0].public_id}")
    assert verify.status_code == 200
    assert verify.json()["status"] == "flagged"


@pytest.mark.asyncio
async def test_streak_and_rank_milestones_award_on_state_reach(
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Streak (7 days) and rank (Spartan, level 3) badges are awarded when the freshly
    resolved ProgressContext crosses the threshold after an event. Ledger entries are
    back-dated to build the streak timeline; XP is raised to cross the Spartan band."""
    from datetime import UTC, datetime, timedelta

    from gamification.context.resolver import ProgressContextResolver
    from gamification.integrity.ledger_hash import GENESIS_HASH, HashableEntry, compute_entry_hash
    from gamification.services.event_processor import GamificationEventProcessor

    user_id = uuid.uuid4()
    ledger = LedgerRepository(db_session)
    day_offsets = [0, 1, 2, 3, 4, 5, 6]
    for _ in day_offsets:
        await ledger.append(
            user_id=user_id,
            event_id=uuid.uuid4(),
            xp_type="completion",
            xp_delta=1_000,  # 7k completion XP + mastery below -> lands in Spartan band
            reason_code="COURSE_COMPLETE",
        )
    await db_session.flush()
    entries = await ledger.list_for_user(user_id)
    prev_hash = GENESIS_HASH
    for position, (entry, offset) in enumerate(
        sorted(zip(entries, day_offsets, strict=True), key=lambda p: p[1], reverse=True)
    ):
        entry.created_at = (
            datetime.now(UTC) - timedelta(days=offset) + timedelta(microseconds=position)
        )
        entry.prev_hash = prev_hash
        entry.entry_hash = compute_entry_hash(
            prev_hash,
            HashableEntry(
                user_id=entry.user_id,
                xp_delta=entry.xp_delta,
                reason_code=entry.reason_code,
                created_at=entry.created_at,
            ),
        )
        prev_hash = entry.entry_hash
    await db_session.commit()

    context = await ProgressContextResolver(db_session).resolve(user_id)
    assert context.streak.current_streak_days == 7
    assert context.rank.level >= 3

    # Any XP-bearing event after the state is reached triggers the state-milestone badges.
    event = _course_event(user_id=user_id)
    result = await GamificationEventProcessor(db_session).process(event)
    await db_session.commit()

    # The course event also triggers the first-course badge (the user just completed a
    # course) — all three milestones are awarded once.
    awarded = {award.badge_id for award in result.awarded_badges}
    assert awarded == {"first_course_completed", "streak_seven", "rank_spartan"}
    assert len(await UserBadgeRepository(db_session).list_for_user(user_id)) == 3

    # Re-processing the same event cannot duplicate them.
    again = await GamificationEventProcessor(db_session).process(event)
    await db_session.commit()
    assert again.awarded_badges == []
    assert len(await UserBadgeRepository(db_session).list_for_user(user_id)) == 3


# ---------------------------------------------------------------------------
# Read APIs — verify semantics
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_verify_unknown_and_forged_credential_ids_are_404(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    client, _redis = real_redis_client
    unknown = await client.get("/api/v1/verify/does-not-exist")
    assert unknown.status_code == 404
    forged = await client.get("/api/v1/verify/" + "x" * 32)
    assert forged.status_code == 404


@pytest.mark.asyncio
async def test_badges_endpoint_requires_authentication(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
) -> None:
    client, _redis = real_redis_client
    response = await client.get("/api/v1/me/badges")
    assert response.status_code == 401
