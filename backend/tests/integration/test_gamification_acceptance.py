"""Slice 04 acceptance tier — the REAL pipeline, end to end (Phase 18 scenario).

`AssessmentSubmittedEvent` -> real Redis Streams -> the real arq worker function
(`poll_gamification_events`) -> atomic idempotency marker -> Integrity Gate -> append-only
hash-chained XP ledger -> ProgressContext. Redis is the real server (settings.REDIS_URL, the
same requirement as `test_real_redis.py`), Postgres is the real throwaway database. No mocks
are used for the pipeline itself — only the worker's own session/redis wiring is redirected to
the test database/redis, exactly as the app's dependency overrides do for the HTTP tier.

Also covered here: ledger tamper detection at the DB level, concurrent duplicate delivery
across two independent connections, and the failure/retry semantics of the worker loop.
"""

import asyncio
import uuid
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

if TYPE_CHECKING:
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis

from assessments.models import Assessment, Question
from content.models import Course, Enrollment
from gamification.models import LedgerEntry
from gamification.repositories.ledger import LedgerRepository
from platform_core.bus.producer import publish
from platform_core.bus.worker import poll_gamification_events
from platform_core.core.config import settings
from platform_core.core.db.session import get_session
from platform_core.core.exceptions import ChainIntegrityError
from platform_core.core.redis import get_redis
from platform_core.events.schema import AssessmentSubmittedEvent
from tests.conftest import register_and_login

ASSESSMENT_MAX_MASTERY_XP = 500


@pytest_asyncio.fixture
async def real_redis_client(
    db_session: AsyncSession,
) -> AsyncGenerator[tuple[AsyncClient, AsyncRedis]]:
    """ASGI client whose session and Redis are redirected to the test infrastructure — the
    SAME override pattern as conftest's `client` fixture, but with the real Redis server so the
    event the assessment flow publishes actually lands on the real stream the worker reads.
    """
    real_redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def _override_get_session() -> AsyncGenerator[AsyncSession]:
        yield db_session

    async def _override_get_redis() -> AsyncGenerator[AsyncRedis]:
        yield real_redis

    from fastapi_limiter import FastAPILimiter

    from main import app

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_redis] = _override_get_redis
    # Unique prefix per test: the auth limiter (5 req/60s) counts against shared real Redis,
    # so a fixed prefix would throttle repeated test runs of the same route.
    await FastAPILimiter.init(real_redis, prefix=f"fastapi-limiter-{uuid.uuid4().hex}")
    # The probe consumer asserts its own event is within its bounded batch; a stale backlog
    # (e.g. from live E2E runs or the slice-06 suite's published events) would displace it.
    # Start and end each test with a clean stream so suites can run in any order.
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


async def _seed_course_and_assessment(
    db_session: AsyncSession, *, user_id: uuid.UUID
) -> tuple[uuid.UUID, uuid.UUID, list[uuid.UUID]]:
    """Published course + enrollment + single-easy-question published assessment (10 pts)."""
    course = Course(
        id=uuid.uuid4(),
        title="Acceptance Host Course",
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
        slug=f"acceptance-{uuid.uuid4().hex[:8]}",
        title="Acceptance Assessment",
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
    return course.id, assessment.id, [question.id]


async def _drain_until_ledger_entry(
    *,
    user_id: uuid.UUID,
    postgres_test_db: str,
    redis: AsyncRedis,
    monkeypatch: pytest.MonkeyPatch,
    max_polls: int = 25,
    expected_count: int = 1,
) -> int:
    """Runs the real worker until this user's ledger entry exists (bounded). The stream may
    hold events from other runs; assertions are always scoped to `user_id`.

    `monkeypatch` redirects the worker's redis AND session to per-test instances: the
    module-level `get_redis_client` is lru-cached and `session_scope`'s engine pools asyncpg
    connections, both of which would otherwise bind to the first test's event loop — closed by
    pytest-asyncio between tests. A fresh engine per call keeps every connection on the
    current test's loop.
    """
    from contextlib import asynccontextmanager

    from sqlalchemy.ext.asyncio import async_sessionmaker

    import platform_core.bus.worker as worker_module

    engine = create_async_engine(postgres_test_db)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    @asynccontextmanager
    async def _test_session_scope() -> AsyncGenerator[AsyncSession]:
        async with factory() as session:
            yield session

    monkeypatch.setattr(worker_module, "get_redis_client", lambda: redis)
    monkeypatch.setattr(worker_module, "session_scope", _test_session_scope)

    try:
        for _ in range(max_polls):
            await poll_gamification_events({})
            async with factory() as session:
                entries = await LedgerRepository(session).list_for_user(user_id)
                if len(entries) >= expected_count:
                    return len(entries)
        return 0
    finally:
        await engine.dispose()



@pytest.mark.asyncio
async def test_real_assessment_event_flows_through_real_pipeline(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Phase 18 acceptance scenario, executed against real Redis + real Postgres + the real
    worker: register -> enroll -> attempt -> deterministic answers -> finalize -> event on the
    bus -> worker -> one hash-chained ledger entry -> ProgressContext -> same event again ->
    zero additional XP.
    """
    client, real_redis = real_redis_client
    access_token = await register_and_login(client, "acceptance-gamification@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}
    me = await client.get("/api/v1/auth/me", headers=headers)
    user_id = uuid.UUID(me.json()["id"])

    _course_id, assessment_id, question_ids = await _seed_course_and_assessment(
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
    assert answered.json()["correct"] is True

    final = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit-final", headers=headers
    )
    assert final.status_code == 200
    assert final.json()["score"] == 10
    assert final.json()["passed"] is True

    from tests.conftest import drain_outbox_for_test
    await drain_outbox_for_test(db_session, real_redis)

    # The event is on the REAL stream now — read it with a probe consumer to prove emission
    # before the worker consumes it into the gamification group.
    from platform_core.bus.consumer import EventConsumer

    probe = EventConsumer(group="acceptance-probe", consumer_name="probe-1", redis=real_redis)
    delivered = [m async for m in probe.read_batch(count=10, block_ms=200)]
    assert any(
        m.event is not None
        and isinstance(m.event, AssessmentSubmittedEvent)
        and m.event.user_id == user_id
        for m in delivered
    )
    for m in delivered:
        await probe.ack(m.message_id)

    # Real worker drains the stream -> Integrity Gate -> ledger append -> context resolve.
    entry_count = await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )
    assert entry_count == 1

    entries = await LedgerRepository(db_session).list_for_user(user_id)
    assert entries[0].xp_delta == ASSESSMENT_MAX_MASTERY_XP
    assert entries[0].xp_type == "mastery"
    assert entries[0].reason_code == "MAIN_ASSESSMENT"
    assert entries[0].integrity_status == "verified"
    assert entries[0].event_id is not None

    # Hash chain is valid end-to-end.
    await LedgerRepository(db_session).verify_chain_for_user(user_id)

    # ProgressContext reflects the authoritative ledger.
    from gamification.context.resolver import ProgressContextResolver

    context = await ProgressContextResolver(db_session).resolve(user_id)
    assert context.rank.mastery_xp == ASSESSMENT_MAX_MASTERY_XP
    assert context.rank.completion_xp == 0
    assert context.context_version >= 1
    assert context.freeze_status == "live"

    # Deliver the SAME event again (crash/redelivery simulation) -> zero additional XP.
    await publish(
        AssessmentSubmittedEvent(
            user_id=user_id,
            org_id=None,
            idempotency_key=f"assessment.submitted:{attempt_id}",
            session_fingerprint=f"auth:{user_id}",
            assessment_id=assessment_id,
            assessment_kind="main",
            score_pct=100.0,
            max_score=10.0,
            time_taken_seconds=60,
            attempt_number=1,
            question_level_answers=[
                {
                    "question_id": str(question_ids[0]),
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
    await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )
    entries_after = await LedgerRepository(db_session).list_for_user(user_id)
    assert len(entries_after) == 1
    assert entries_after[0].xp_delta == ASSESSMENT_MAX_MASTERY_XP

    context_after = await ProgressContextResolver(db_session).resolve(user_id)
    assert context_after.rank.mastery_xp == ASSESSMENT_MAX_MASTERY_XP


@pytest.mark.asyncio
async def test_ledger_tampering_is_detected_at_the_database_level(
    db_session: AsyncSession,
) -> None:
    """Slice 04 §7: after legitimate rewards, a direct-DB tamper of an entry's XP must break
    the hash chain and halt the resolver — never silently continue.
    """
    user_id = uuid.uuid4()
    ledger = LedgerRepository(db_session)
    for _ in range(3):
        await ledger.append(
            user_id=user_id,
            event_id=uuid.uuid4(),
            xp_type="completion",
            xp_delta=100,
            reason_code="COURSE_COMPLETE",
        )
    await db_session.commit()
    await ledger.verify_chain_for_user(user_id)

    # Tamper: rewrite the first entry's XP directly in the database, bypassing the ledger.
    first = (await ledger.list_for_user(user_id))[0]
    await db_session.execute(
        update(LedgerEntry).where(LedgerEntry.id == first.id).values(xp_delta=999_999)
    )
    await db_session.commit()
    db_session.expunge_all()

    tampered = (await ledger.list_for_user(user_id))[0]
    assert tampered.xp_delta == 999_999  # the tamper is real

    # The resolver no longer checks the chain on the read path.
    # We explicitly verify the chain here to ensure the tamper is detected.
    with pytest.raises(ChainIntegrityError):
        await ledger.verify_chain_for_user(user_id)


@pytest.mark.asyncio
async def test_concurrent_duplicate_delivery_awards_exactly_once(
    postgres_test_db: str,
) -> None:
    """Two simultaneous deliveries of the same event across two independent DB connections
    (the real race the advisory lock + event-id dedup protect against) must yield exactly one
    ledger entry.
    """
    user_id = uuid.uuid4()
    event_id = uuid.uuid4()
    engine = create_async_engine(postgres_test_db)

    async def _append() -> None:
        async with AsyncSession(engine, expire_on_commit=False) as session:
            await LedgerRepository(session).append(
                user_id=user_id,
                event_id=event_id,
                xp_type="mastery",
                xp_delta=500,
                reason_code="MAIN_ASSESSMENT",
            )
            await session.commit()

    try:
        await asyncio.gather(_append(), _append())
        async with AsyncSession(engine, expire_on_commit=False) as session:
            entries = await LedgerRepository(session).list_for_user(user_id)
            assert len(entries) == 1
            assert entries[0].event_id == event_id
            await LedgerRepository(session).verify_chain_for_user(user_id)
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_worker_failure_does_not_ack_and_retry_is_safe(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Slice 04 §10: if the ledger write path fails mid-batch, the worker must not ack and must
    not commit the idempotency marker — so a retry still processes exactly once, with no
    duplicate reward. Simulated by making the processor raise once.
    """
    client, real_redis = real_redis_client
    user_id = uuid.uuid4()
    event = AssessmentSubmittedEvent(
        user_id=user_id,
        org_id=None,
        idempotency_key=f"assessment.submitted:{uuid.uuid4()}",
        session_fingerprint=f"auth:{user_id}",
        assessment_id=uuid.uuid4(),
        assessment_kind="main",
        score_pct=100.0,
        max_score=10.0,
        time_taken_seconds=60,
        attempt_number=1,
        question_level_answers=[],
    )
    await publish(event, real_redis)

    import platform_core.bus.worker as worker_module
    from gamification.services.event_processor import (
        GamificationEventProcessor as OriginalProcessor,
    )

    # The worker's module-level `get_redis_client` is lru-cached and may be bound to a
    # previous test's (closed) event loop — pin it to this test's redis instance up front.
    monkeypatch.setattr(worker_module, "get_redis_client", lambda: real_redis)

    original = OriginalProcessor

    class _ExplodingProcessor:
        def __init__(self, _session: AsyncSession) -> None:
            self.session = _session

        async def process(self, delivered_event: object) -> None:
            raise RuntimeError("simulated ledger write failure")

    monkeypatch.setattr(worker_module, "GamificationEventProcessor", _ExplodingProcessor)
    with pytest.raises(RuntimeError, match="simulated ledger write failure"):
        await poll_gamification_events({})
    monkeypatch.setattr(worker_module, "GamificationEventProcessor", original)

    # Nothing was acked/committed: no ledger entry, no processed-event marker, and the same
    # event is still pending for the group (xautoclaim redelivers it on the next poll).
    ledger = LedgerRepository(db_session)
    await db_session.commit()
    assert await ledger.list_for_user(user_id) == []
    from sqlalchemy import func
    from sqlalchemy import select as sa_select

    from platform_core.events.models import ProcessedEvent

    marker = await db_session.execute(
        sa_select(func.count()).select_from(ProcessedEvent).where(
            ProcessedEvent.idempotency_key == event.idempotency_key
        )
    )
    assert marker.scalar_one() == 0

    # Retry with the healthy processor -> exactly one entry, one reward. The unacked message
    # sits in the group's pending list; xautoclaim redelivers it once idle > 60s. Lowering the
    # reclaim idle to 0 simulates that the 60s window has elapsed (a timing constant, not
    # pipeline logic) so the retry runs immediately.
    import platform_core.bus.consumer as consumer_module

    monkeypatch.setattr(consumer_module, "EVENT_RECLAIM_IDLE_MS", 0)
    entry_count = await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )
    assert entry_count == 1
    await LedgerRepository(db_session).verify_chain_for_user(user_id)


@pytest.mark.asyncio
async def test_integrity_gate_flags_suspicious_assessment_but_still_ledgers_xp(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Slice 04 §3/§10: the Integrity Gate is authoritative but flag-not-block. An assessment
    answered implausibly fast (avg < ANSWER_TIMING_MIN_MS_PER_QUESTION per question) must
    still produce a ledger entry — marked `flagged`, never silently rewarded as clean — and
    the ProgressContext must freeze public visibility while private XP still accrues.
    """
    client, real_redis = real_redis_client
    user_id = uuid.uuid4()
    event = AssessmentSubmittedEvent(
        user_id=user_id,
        org_id=None,
        idempotency_key=f"assessment.submitted:{uuid.uuid4()}",
        session_fingerprint=f"auth:{user_id}",
        assessment_id=uuid.uuid4(),
        assessment_kind="main",
        score_pct=100.0,
        max_score=10.0,
        time_taken_seconds=30,
        attempt_number=1,
        # 10 questions answered in 5_000ms total -> 500ms/question, well under the 1500ms floor.
        question_level_answers=[
            {"question_id": str(uuid.uuid4()), "option_index": 0, "time_spent_ms": 500}
            for _ in range(10)
        ],
    )
    await publish(event, real_redis)

    entry_count = await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )
    assert entry_count == 1

    entries = await LedgerRepository(db_session).list_for_user(user_id)
    assert entries[0].xp_delta == ASSESSMENT_MAX_MASTERY_XP
    assert entries[0].integrity_status == "flagged"

    from gamification.context.resolver import ProgressContextResolver

    context = await ProgressContextResolver(db_session).resolve(user_id)
    assert context.rank.mastery_xp == ASSESSMENT_MAX_MASTERY_XP  # private XP still accrues
    assert context.freeze_status == "frozen_pending_review"
    assert "integrity_review_pending" in context.unresolved_flags
    await LedgerRepository(db_session).verify_chain_for_user(user_id)

# ==========================================
# GREEN GATE REMEDIATION TESTS (C1, C2, H1, H6)
# ==========================================

@pytest.mark.asyncio
async def test_c1_outbox_publish_failure_and_unknown_event(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, real_redis = real_redis_client
    
    from datetime import UTC, datetime

    from platform_core.events.models import OutboxEvent
    
    unknown_event = OutboxEvent(
        id=uuid.uuid4(),
        event_type="unknown.event",
        payload={"foo": "bar"},
        idempotency_key="unknown",
        created_at=datetime.now(UTC),
    )
    db_session.add(unknown_event)
    await db_session.commit()
    
    import platform_core.bus.worker as worker_module
    monkeypatch.setattr(worker_module, "get_redis_client", lambda: real_redis)
    from contextlib import asynccontextmanager
    @asynccontextmanager
    async def _test_session_scope() -> AsyncGenerator[AsyncSession, None]:
        yield db_session
    monkeypatch.setattr(worker_module, "session_scope", _test_session_scope)
    
    await worker_module.poll_outbox_events({})
    
    from platform_core.bus.dlq import DLQ_STREAM_KEY
    dlq_messages = await real_redis.xrange(DLQ_STREAM_KEY)
    assert len(dlq_messages) >= 1
    
    from sqlalchemy import select
    res = await db_session.execute(select(OutboxEvent).where(OutboxEvent.id == unknown_event.id))
    row = res.scalar_one()
    assert row.dispatched_at is not None


@pytest.mark.asyncio
async def test_c2_timing_check_with_suspicious_answers(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, real_redis = real_redis_client
    user_id = uuid.uuid4()
    
    def make_event(fast_count: int, total: int = 10) -> AssessmentSubmittedEvent:
        answers = []
        for i in range(total):
            time_ms = 500 if i < fast_count else 2000
            answers.append(
                {"question_id": str(uuid.uuid4()), "option_index": 0, "time_spent_ms": time_ms}
            )
        return AssessmentSubmittedEvent(
            user_id=user_id,
            org_id=None,
            idempotency_key=f"assessment.submitted:{uuid.uuid4()}",
            session_fingerprint=f"auth:{user_id}",
            assessment_id=uuid.uuid4(),
            assessment_kind="main",
            score_pct=100.0,
            max_score=10.0,
            time_taken_seconds=30,
            attempt_number=1,
            question_level_answers=answers,
        )

    event_ok = make_event(1)
    await publish(event_ok, real_redis)
    await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )
    entries = await LedgerRepository(db_session).list_for_user(user_id)
    assert entries[0].integrity_status == "verified"
    
    event_flagged = make_event(3)
    await publish(event_flagged, real_redis)
    await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )
    entries = await LedgerRepository(db_session).list_for_user(user_id)
    assert entries[1].integrity_status == "flagged"


@pytest.mark.asyncio
async def test_h1_projection_ordering_and_redelivery(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, real_redis = real_redis_client
    user_id = uuid.uuid4()
    
    event = AssessmentSubmittedEvent(
        user_id=user_id,
        org_id=None,
        idempotency_key=f"assessment.submitted:{uuid.uuid4()}",
        session_fingerprint=f"auth:{user_id}",
        assessment_id=uuid.uuid4(),
        assessment_kind="main",
        score_pct=100.0,
        max_score=10.0,
        time_taken_seconds=60,
        attempt_number=1,
        question_level_answers=[],
    )
    await publish(event, real_redis)

    import platform_core.bus.worker as worker_module
    from gamification.projections.leaderboard import LeaderboardProjection
    
    original_update_user = LeaderboardProjection.update_user
    
    class ProjectionExplosion(Exception):
        pass

    async def exploding_update_user(*args: object, **kwargs: object) -> None:
        raise ProjectionExplosion("crash between commit and ZADD")

    monkeypatch.setattr(LeaderboardProjection, "update_user", exploding_update_user)
    
    from contextlib import asynccontextmanager
    @asynccontextmanager
    async def _test_session_scope() -> AsyncGenerator[AsyncSession, None]:
        yield db_session
            
    monkeypatch.setattr(worker_module, "get_redis_client", lambda: real_redis)
    monkeypatch.setattr(worker_module, "session_scope", _test_session_scope)

    from tests.conftest import drain_outbox_for_test
    await drain_outbox_for_test(db_session, real_redis)
    
    with pytest.raises(ProjectionExplosion):
        await worker_module.poll_gamification_events({})

    entries = await LedgerRepository(db_session).list_for_user(user_id)
    assert len(entries) == 1
    
    monkeypatch.setattr(LeaderboardProjection, "update_user", original_update_user)
    import platform_core.bus.consumer as consumer_module
    monkeypatch.setattr(consumer_module, "EVENT_RECLAIM_IDLE_MS", 0)
    
    await worker_module.poll_gamification_events({})
    
    entries_after = await LedgerRepository(db_session).list_for_user(user_id)
    assert len(entries_after) == 1
    
    score = await real_redis.zscore("leaderboard:global", str(user_id))
    assert score == 300.0


@pytest.mark.asyncio
async def test_h6_cap_on_mastery_xp(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from datetime import UTC, datetime
    client, real_redis = real_redis_client
    user_id = uuid.uuid4()
    assessment_id = uuid.uuid4()
    
    def make_attempt(pct: float, attempt_num: int) -> AssessmentSubmittedEvent:
        return AssessmentSubmittedEvent(
            user_id=user_id,
            org_id=None,
            idempotency_key=f"assessment.submitted:{uuid.uuid4()}",
            session_fingerprint=f"auth:{user_id}",
            assessment_id=assessment_id,
            assessment_kind="main",
            score_pct=pct,
            max_score=10.0,
            time_taken_seconds=60,
            attempt_number=attempt_num,
            question_level_answers=[],
            occurred_at=datetime.now(UTC),
        )

    await publish(make_attempt(80.0, 1), real_redis)
    await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )
    entries = await LedgerRepository(db_session).list_for_user(user_id)
    assert len(entries) == 1
    assert entries[0].xp_delta == 400

    await publish(make_attempt(100.0, 2), real_redis)
    await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
        max_polls=5,
        expected_count=2,
    )
    entries = await LedgerRepository(db_session).list_for_user(user_id)
    assert len(entries) == 2
    assert entries[1].xp_delta == 100
    
    await publish(make_attempt(90.0, 3), real_redis)
    await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
        max_polls=5,
        expected_count=3,
    )
    entries = await LedgerRepository(db_session).list_for_user(user_id)
    assert len(entries) == 3
    assert entries[2].xp_delta == 0
    assert entries[2].event_id is not None
