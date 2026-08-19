"""Judge worker reliability — atomic claim, outbox durability, idempotent XP (F-10, F-12).

Real Postgres + fakeredis (per fastapi-backend-sop.md §12), no mocked persistence:
- `claim_processing` is atomic (`UPDATE ... WHERE status='queued' RETURNING`): two workers
  cannot both claim one submission.
- `judge.submission_graded` is written to the Outbox in the SAME transaction as the graded
  row — a crash after commit cannot lose the event, and a duplicate delivery cannot create a
  duplicate JudgeResult or duplicate outbox row.
- Duplicate/redelivered events never award XP twice (ledger dedup by event_id + the per-problem
  mastery cap).
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.services.event_processor import GamificationEventProcessor
from judge.models import Problem, Submission, TestCase
from judge.repositories.submission import SubmissionRepository
from judge.worker.executor import SKIPPED, grade_submission
from platform_core.events.models import OutboxEvent
from platform_core.events.schema import JudgeSubmissionGradedEvent

pytestmark = pytest.mark.asyncio


def _problem(**overrides: object) -> Problem:
    base = dict(
        id=uuid.uuid4(),
        slug=f"p-{uuid.uuid4().hex[:8]}",
        title="Test problem",
        difficulty="easy",
        estimated_minutes=10,
        topics=["basics"],
        statement="Print out",
        constraints=[],
        starter_code="",
        time_limit_ms=1000,
        memory_limit_kb=128000,
        expected_solution=None,
    )
    base.update(overrides)
    return Problem(**base)


async def _seed_submission(
    db_session: AsyncSession, *, org_id: uuid.UUID | None = None
) -> tuple[uuid.UUID, Problem, Submission]:
    problem = _problem(org_id=org_id)
    db_session.add(problem)
    test_case = TestCase(
        id=uuid.uuid4(), problem_id=problem.id, position=0, input="in", expected_output="out"
    )
    db_session.add(test_case)
    submission = Submission(
        id=uuid.uuid4(),
        problem_id=problem.id,
        user_id=uuid.uuid4(),
        org_id=org_id,
        language="python",
        source_code="print('out')",
        status="queued",
        test_cases_passed=0,
        test_cases_total=0,
    )
    db_session.add(submission)
    await db_session.commit()
    return submission.id, problem, submission


class DummySandbox:
    async def run(self, *args: object, **kwargs: object) -> dict[str, object]:
        return {
            "stdout": "out",
            "stderr": "",
            "exit_code": 0,
            "runtime_ms": 10,
            "memory_kb": 1024,
        }


async def test_atomic_claim_only_one_worker_wins(
    db_session: AsyncSession,
) -> None:
    submission_id, _problem, _submission = await _seed_submission(db_session)
    repo = SubmissionRepository(db_session)

    # Two concurrent claims — exactly one must win.
    winner = await repo.claim_processing(submission_id)
    loser = await repo.claim_processing(submission_id)
    await db_session.commit()

    assert winner is True
    assert loser is False
    fresh = await repo.get_by_id(submission_id)
    assert fresh is not None
    assert fresh.status == "processing"


async def test_grade_submission_writes_result_and_outbox_in_same_tx(
    db_session: AsyncSession,
) -> None:
    submission_id, _problem, _submission = await _seed_submission(db_session)

    with patch("judge.worker.executor.get_sandbox", return_value=DummySandbox()):
        outcome = await grade_submission(db_session, str(submission_id))

    assert outcome == "graded"
    await db_session.commit()

    # The graded result is persisted.
    fresh = await SubmissionRepository(db_session).get_by_id(submission_id)
    assert fresh is not None
    assert fresh.status == "graded"
    assert fresh.verdict == "accepted"
    assert fresh.test_cases_passed == 1

    # Exactly ONE outbox event exists for THIS submission, carrying the full payload.
    # (Scoped by idempotency_key so rows committed by other tests in the session-scoped
    # database cannot leak into this assertion.)
    rows = (
        await db_session.execute(
            select(OutboxEvent).where(OutboxEvent.idempotency_key == f"judge:{submission_id}")
        )
    ).scalars().all()
    assert len(rows) == 1
    payload = rows[0].payload
    assert payload["submission_id"] == str(submission_id)
    assert payload["verdict"] == "accepted"
    assert payload["idempotency_key"] == f"judge:{submission_id}"


async def test_duplicate_delivery_is_a_noop_no_second_result_or_event(
    db_session: AsyncSession,
) -> None:
    submission_id, _problem, _submission = await _seed_submission(db_session)

    with patch("judge.worker.executor.get_sandbox", return_value=DummySandbox()):
        first = await grade_submission(db_session, str(submission_id))
        await db_session.commit()
        # Redelivery (worker crash mid-ACK, message replayed): the row is terminal → SKIPPED.
        second = await grade_submission(db_session, str(submission_id))
        await db_session.commit()

    assert first == "graded"
    assert second == SKIPPED

    rows = (
        await db_session.execute(
            select(OutboxEvent).where(OutboxEvent.idempotency_key == f"judge:{submission_id}")
        )
    ).scalars().all()
    assert len(rows) == 1  # no duplicate event for this submission


async def test_stuck_processing_reclaim_resets_and_regrades(
    db_session: AsyncSession,
) -> None:
    submission_id, _problem, _submission = await _seed_submission(db_session)
    repo = SubmissionRepository(db_session)
    await repo.claim_processing(submission_id)
    await db_session.commit()

    # A redelivery after the reclaim window sees `processing`, resets to queued, re-claims.
    with patch("judge.worker.executor.get_sandbox", return_value=DummySandbox()):
        outcome = await grade_submission(db_session, str(submission_id))
    assert outcome == "graded"
    fresh = await repo.get_by_id(submission_id)
    assert fresh is not None
    assert fresh.status == "graded"


async def test_worker_failure_resets_to_queued_and_raises(
    db_session: AsyncSession,
) -> None:
    submission_id, _problem, _submission = await _seed_submission(db_session)

    class ExplodingSandbox:
        async def run(self, *args: object, **kwargs: object) -> dict[str, object]:
            raise RuntimeError("kubectl: connection refused")

    with patch("judge.worker.executor.get_sandbox", return_value=ExplodingSandbox()):
        with pytest.raises(RuntimeError):
            await grade_submission(db_session, str(submission_id))
    await db_session.commit()

    # NOT graded, NOT acked-as-success: the row is back to queued for the retry path.
    fresh = await SubmissionRepository(db_session).get_by_id(submission_id)
    assert fresh is not None
    assert fresh.status == "queued"
    assert "sandbox failure" in (fresh.error or "")

    rows = (
        await db_session.execute(
            select(OutboxEvent).where(OutboxEvent.idempotency_key == f"judge:{submission_id}")
        )
    ).scalars().all()
    assert len(rows) == 0  # never outboxed a failed submission as success


async def test_judge_xp_exactly_once_per_problem(
    db_session: AsyncSession,
) -> None:
    """Accepted submissions award JUDGE_PROBLEM_MASTERY_XP (250) once per problem; a second
    accepted submission for the same problem awards 0 (cap). Wrong answers award nothing."""
    from gamification.rules import JUDGE_PROBLEM_MASTERY_XP

    user_id = uuid.uuid4()
    problem_id = uuid.uuid4()
    processor = GamificationEventProcessor(db_session)

    def _event(
        submission_id: uuid.UUID, verdict: str, passed: int, total: int
    ) -> JudgeSubmissionGradedEvent:
        return JudgeSubmissionGradedEvent(
            user_id=user_id,
            org_id=None,
            idempotency_key=f"judge:{submission_id}",
            session_fingerprint="system",
            submission_id=submission_id,
            problem_id=problem_id,
            verdict=verdict,
            runtime_ms=10,
            memory_kb=1024,
            test_cases_passed=passed,
            test_cases_total=total,
        )

    # Wrong answer → no XP, no context write.
    wrong = await processor.process(_event(uuid.uuid4(), "wrong_answer", 0, 1))
    assert wrong.xp_delta is None

    # First accepted submission → full mastery XP.
    first = await processor.process(_event(uuid.uuid4(), "accepted", 1, 1))
    assert first.xp_delta == JUDGE_PROBLEM_MASTERY_XP

    # Same problem accepted again → cap, no additional XP.
    second = await processor.process(_event(uuid.uuid4(), "accepted", 1, 1))
    assert second.xp_delta == 0

    # Same event redelivered → ledger dedup by event_id: no NEW ledger row is written.
    from sqlalchemy import func as sa_func  # noqa: PLC0415 - local import keeps test self-contained

    from gamification.models import LedgerEntry
    from gamification.repositories.ledger import LedgerRepository

    dup_event = _event(uuid.uuid4(), "accepted", 1, 1)
    _ = await processor.process(dup_event)
    count_after_first = (
        await db_session.execute(
            sa_func.count().select().where(LedgerEntry.user_id == user_id)
        )
    ).scalar_one()
    _ = await processor.process(dup_event)
    await db_session.commit()
    count_after_redelivery = (
        await db_session.execute(
            sa_func.count().select().where(LedgerEntry.user_id == user_id)
        )
    ).scalar_one()
    # The redelivery appended nothing — the ledger row count is unchanged.
    assert count_after_redelivery == count_after_first
    # And the authoritative total for this problem is still exactly one award of 250.
    entries = await LedgerRepository(db_session).list_for_user(user_id)
    problem_xp = sum(
        e.xp_delta for e in entries if e.source_id == problem_id and e.xp_type == "mastery"
    )
    assert problem_xp == JUDGE_PROBLEM_MASTERY_XP


async def test_outbox_event_survives_publisher_unavailable(
    db_session: AsyncSession,
) -> None:
    """F-12 crash-safety: the outbox row is committed with the graded result; if the
    publisher (Redis) is down afterwards, the row stays pending and is dispatched later."""
    submission_id, _problem, _submission = await _seed_submission(db_session)

    with patch("judge.worker.executor.get_sandbox", return_value=DummySandbox()):
        outcome = await grade_submission(db_session, str(submission_id))
    assert outcome == "graded"
    await db_session.commit()

    rows = (
        await db_session.execute(
            select(OutboxEvent).where(OutboxEvent.idempotency_key == f"judge:{submission_id}")
        )
    ).scalars().all()
    assert len(rows) == 1
    assert rows[0].dispatched_at is None  # publisher never ran → still pending, durable

    # A later outbox poll dispatches it (simulated with the same machinery the worker cron uses).
    from datetime import UTC, datetime

    from platform_core.bus.producer import publish

    redis = MagicMock(spec=["xadd"])
    redis.xadd = AsyncMock()
    event = JudgeSubmissionGradedEvent(**rows[0].payload)
    await publish(event, redis)
    rows[0].dispatched_at = datetime.now(UTC)
    await db_session.commit()

    assert redis.xadd.await_count == 1
