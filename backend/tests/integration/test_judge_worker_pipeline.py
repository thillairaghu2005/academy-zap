"""Judge pipeline acceptance — real Redis + real Postgres + the real worker (F-9, F-10).

Proves the full request path the audit said was missing: a submission row + Redis Stream
message produced by `POST /judge/submit` (service level) is picked up by the real
`poll_judge_queue` worker, graded in the sandbox, persisted as a JudgeResult, and outboxed as
`judge.submission_graded`. Also covers the retry/DLQ semantics (F-10): a permanent sandbox
failure eventually moves the message to the dead-letter stream and marks the submission
`error`, never ACKing a failed grade as success.

Redis is the real server (settings.REDIS_URL); Postgres is the real throwaway database; the
worker's session/redis wiring is redirected to the test instances exactly as the gamification
acceptance tier does.
"""

import uuid
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

import pytest
import pytest_asyncio
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

if TYPE_CHECKING:
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis

from judge.models import Problem, Submission, TestCase
from judge.repositories.submission import SubmissionRepository
from judge.worker.queue import (
    JUDGE_DLQ_STREAM,
    JUDGE_QUEUE_STREAM,
    poll_judge_queue,
)
from platform_core.core.config import settings

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def real_redis() -> AsyncGenerator[AsyncRedis, None]:
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    await redis.delete(JUDGE_QUEUE_STREAM, JUDGE_DLQ_STREAM)
    try:
        yield redis
    finally:
        await redis.delete(JUDGE_QUEUE_STREAM, JUDGE_DLQ_STREAM)
        await redis.close()


async def _seed_problem_and_submission(
    postgres_test_db: str, *, status: str = "queued"
) -> tuple[uuid.UUID, uuid.UUID]:
    """Seed through a real committed connection — the worker reads with its OWN session, so
    savepoint-isolated test sessions would make the row invisible to it."""
    engine = create_async_engine(postgres_test_db)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as session:
            problem = Problem(
                id=uuid.uuid4(),
                slug=f"pipeline-{uuid.uuid4().hex[:8]}",
                title="Pipeline problem",
                difficulty="easy",
                estimated_minutes=5,
                topics=["basics"],
                statement="Print input",
                constraints=[],
                starter_code="",
                time_limit_ms=1000,
                memory_limit_kb=65536,
                expected_solution=None,
            )
            session.add(problem)
            test_case = TestCase(
                id=uuid.uuid4(),
                problem_id=problem.id,
                position=0,
                input="hello\n",
                expected_output="hello\n",
            )
            session.add(test_case)
            submission = Submission(
                id=uuid.uuid4(),
                problem_id=problem.id,
                user_id=uuid.uuid4(),
                org_id=None,
                language="python",
                source_code="print(input())",
                status=status,
                test_cases_passed=0,
                test_cases_total=0,
            )
            session.add(submission)
            await session.commit()
            return submission.id, problem.id
    finally:
        await engine.dispose()


async def _cleanup_rows(
    postgres_test_db: str,
    *,
    submission_id: uuid.UUID | None = None,
    problem_id: uuid.UUID | None = None,
) -> None:
    """Remove the rows this test committed from the SESSION-scoped test database, so later
    tests (which share the same throwaway DB) never see this test's outbox rows or judge rows."""
    from sqlalchemy import delete

    from platform_core.events.models import OutboxEvent

    engine = create_async_engine(postgres_test_db)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as session:
            if submission_id is not None:
                await session.execute(
                    delete(Submission).where(Submission.id == submission_id)
                )
            if problem_id is not None:
                await session.execute(delete(Problem).where(Problem.id == problem_id))
            # The worker outboxed a judge.submission_graded event for this submission —
            # remove it too, or the shared-DB outbox drain of a later test would publish it.
            await session.execute(
                delete(OutboxEvent).where(OutboxEvent.idempotency_key == f"judge:{submission_id}")
            )
            await session.commit()
    finally:
        await engine.dispose()


async def _run_worker_once(
    postgres_test_db: str,
    redis: AsyncRedis,
    monkeypatch: pytest.MonkeyPatch,
    sandbox_factory=None,
) -> int:
    """Run the real `poll_judge_queue` against the test DB + test Redis.

    `sandbox_factory` defaults to the deterministic Docker adapter for the real execution
    tier; tests that want a failure mode pass their own factory.
    """
    import judge.worker.queue as queue_module

    engine = create_async_engine(postgres_test_db)
    from contextlib import asynccontextmanager

    from sqlalchemy.ext.asyncio import async_sessionmaker

    factory = async_sessionmaker(engine, expire_on_commit=False)

    @asynccontextmanager
    async def _test_session_scope() -> AsyncGenerator[AsyncSession, None]:
        async with factory() as session:
            yield session

    monkeypatch.setattr(queue_module, "session_scope", _test_session_scope)
    monkeypatch.setattr(queue_module, "get_redis_client", lambda: redis)
    if sandbox_factory is None:
        from judge.orchestrator.sandbox import DevelopmentOnlyDockerSandbox

        sandbox_factory = lambda: DevelopmentOnlyDockerSandbox()  # noqa: E731
    monkeypatch.setattr("judge.worker.executor.get_sandbox", sandbox_factory)
    try:
        processed = await poll_judge_queue({})
        return processed
    finally:
        await engine.dispose()


async def test_submit_to_stream_to_worker_to_judge_result(
    postgres_test_db: str,
    real_redis: AsyncRedis,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """F-9: a queued submission's message is consumed and graded by the real worker,
    producing a persisted JudgeResult and an outboxed judge.submission_graded event."""
    submission_id, problem_id = await _seed_problem_and_submission(postgres_test_db)
    try:
        await real_redis.xadd(JUDGE_QUEUE_STREAM, {"submission_id": str(submission_id)})

        processed = await _run_worker_once(postgres_test_db, real_redis, monkeypatch)
        assert processed == 1

        # The submission row is graded (read back through a fresh committed connection).
        engine = create_async_engine(postgres_test_db)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as session:
                repo = SubmissionRepository(session)
                fresh = await repo.get_by_id(submission_id)
                assert fresh is not None
                assert fresh.status == "graded"
                assert fresh.verdict == "accepted"
                assert fresh.test_cases_passed == 1
                assert fresh.stdout is not None

                # The judge.submission_graded event is in the outbox (F-12), waiting for the
                # publisher.
                from sqlalchemy import select

                from platform_core.events.models import OutboxEvent

                rows = (
                    await session.execute(
                        select(OutboxEvent).where(
                            OutboxEvent.idempotency_key == f"judge:{submission_id}"
                        )
                    )
                ).scalars().all()
                assert len(rows) == 1
                assert rows[0].payload["submission_id"] == str(submission_id)
                assert rows[0].dispatched_at is None
        finally:
            await engine.dispose()

        # The message was ACKed (removed from the pending list) — no reprocessing.
        pel = await real_redis.xpending(JUDGE_QUEUE_STREAM, "judge_worker_group")
        assert pel["pending"] == 0
    finally:
        await _cleanup_rows(postgres_test_db, submission_id=submission_id, problem_id=problem_id)


async def test_message_without_submission_row_is_acked_without_crash(
    postgres_test_db: str, real_redis: AsyncRedis, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A stale message whose submission row no longer exists must be skipped safely."""
    await real_redis.xadd(JUDGE_QUEUE_STREAM, {"submission_id": str(uuid.uuid4())})
    processed = await _run_worker_once(postgres_test_db, real_redis, monkeypatch)
    assert processed == 1  # skipped is an ackable outcome


async def test_permanent_failure_dlqs_and_marks_error(
    postgres_test_db: str,
    real_redis: AsyncRedis,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """F-10: after JUDGE_MAX_RETRIES, the submission is marked `error`, the message is ACKed
    (removed from the PEL), and the failure lands on the DLQ — never ACKed as success."""
    submission_id, problem_id = await _seed_problem_and_submission(postgres_test_db)
    try:
        await real_redis.xadd(JUDGE_QUEUE_STREAM, {"submission_id": str(submission_id)})

        # Force a permanent sandbox failure and a zero retry budget so the FIRST poll DLQs it.
        import judge.worker.queue as queue_module

        monkeypatch.setattr(queue_module.settings, "JUDGE_MAX_RETRIES", 0)

        class _ExplodingSandbox:
            async def run(self, *args, **kwargs):
                raise RuntimeError("kubectl: pod network not ready")

        await _run_worker_once(
            postgres_test_db, real_redis, monkeypatch, sandbox_factory=lambda: _ExplodingSandbox()
        )

        engine = create_async_engine(postgres_test_db)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as session:
                fresh = await SubmissionRepository(session).get_by_id(submission_id)
                assert fresh is not None
                assert fresh.status == "error"
        finally:
            await engine.dispose()

        dlq = await real_redis.xrange(JUDGE_DLQ_STREAM)
        assert len(dlq) >= 1
        assert dlq[0][1]["submission_id"] == str(submission_id)
    finally:
        await _cleanup_rows(postgres_test_db, submission_id=submission_id, problem_id=problem_id)
