"""Judge grading executor — the unit of work the queue polls (F-9/F-10).

Reliability contract (slice 10 remediation):
- Claim is ATOMIC: `UPDATE ... WHERE status='queued' RETURNING` — only one worker can claim a
  submission; a concurrent delivery observes zero rows and skips (no double JudgeResult).
- Crash recovery: a reclaimed message whose row is stuck in `processing` (previous worker died
  mid-grade) is reset to `queued` and re-claimed. Safe because reclaim only happens after the
  sandbox wall budget (JUDGE_RECLAIM_IDLE_MS) has elapsed, so the previous attempt cannot still
  be running.
- Event durability (F-12): `judge.submission_graded` is written to the Outbox in the SAME
  transaction as the graded result; the outbox publisher dispatches it to the bus. A crash
  after commit can never lose the event.
- Grading exceptions propagate to the queue layer, which decides retry vs dead-letter — never
  silently ACKed as success.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from sqlalchemy import func, update
from sqlalchemy.ext.asyncio import AsyncSession

from judge.grader import Grader
from judge.models import Submission
from judge.orchestrator.sandbox import SandboxOrchestrator, get_sandbox
from judge.repositories.problem import ProblemRepository
from judge.repositories.submission import SubmissionRepository
from platform_core.events.models import OutboxEvent
from platform_core.events.schema import JudgeSubmissionGradedEvent

logger = structlog.get_logger(__name__)

# Outcomes returned to the queue layer.
GRADED = "graded"  # graded and event outboxed — safe to ACK
SKIPPED = "skipped"  # terminal/already-handled/not-found — safe to ACK


async def grade_submission(session: AsyncSession, submission_id_str: str) -> str:
    submission_id = uuid.UUID(submission_id_str)
    sub_repo = SubmissionRepository(session)
    prob_repo = ProblemRepository(session)

    submission = await sub_repo.get_by_id(submission_id)
    if submission is None:
        logger.error("Submission not found", submission_id=submission_id_str)
        return SKIPPED

    if submission.status in ("graded", "error"):
        logger.info(
            "Submission already terminal", submission_id=submission_id_str, status=submission.status
        )
        return SKIPPED

    if submission.status == "processing":
        # Reclaimed delivery after a worker crash mid-grade. The wall budget has elapsed, so the
        # previous attempt cannot still be executing — reset and re-claim (F-10).
        logger.warning(
            "Resetting stuck processing submission", submission_id=submission_id_str
        )
        submission.status = "queued"
        submission.error = None
        await session.commit()

    claimed = await sub_repo.claim_processing(submission_id)
    if not claimed:
        # Another worker claimed it between the read and the UPDATE — nothing for us to do.
        logger.info("Submission claim lost to another worker", submission_id=submission_id_str)
        return SKIPPED

    problem = await prob_repo.get_by_id(submission.problem_id)
    if problem is None:
        logger.error("Problem not found", problem_id=str(submission.problem_id))
        await sub_repo.mark_error(submission_id, "problem not found")
        await session.commit()
        return SKIPPED

    test_cases = list(await sub_repo.get_test_cases(problem.id))
    sandbox: SandboxOrchestrator = get_sandbox()
    grader = Grader(sandbox, problem, test_cases)

    try:
        result = await grader.grade(submission.source_code, submission.language)
    except Exception as exc:
        # Sandbox/infrastructure failure. Record it, reset to queued so the reclaimed message
        # retries, and re-raise — the queue layer owns retry counting / dead-lettering.
        logger.exception("Grading failed", submission_id=submission_id_str, error=str(exc))
        submission.status = "queued"
        submission.error = f"sandbox failure: {exc}"
        await session.commit()
        raise

    submission.status = "graded"
    submission.verdict = result["verdict"]
    submission.runtime_ms = result["runtime_ms"]
    submission.memory_kb = result["memory_kb"]
    submission.test_cases_passed = result["test_cases_passed"]
    submission.test_cases_total = result["test_cases_total"]
    submission.stdout = result["stdout"]
    submission.stderr = result["stderr"]
    submission.compile_output = result["compile_output"]
    submission.cases = result["cases"]
    submission.graded_at = datetime.now(UTC)
    submission.error = None

    event = JudgeSubmissionGradedEvent(
        user_id=submission.user_id,
        org_id=submission.org_id,
        idempotency_key=f"judge:{submission.id}",
        session_fingerprint="system",
        submission_id=submission.id,
        problem_id=submission.problem_id,
        verdict=submission.verdict,
        runtime_ms=submission.runtime_ms,
        memory_kb=submission.memory_kb,
        test_cases_passed=submission.test_cases_passed,
        test_cases_total=submission.test_cases_total,
    )

    # F-12: the event rides the outbox in the SAME transaction as the graded result — a crash
    # between the DB commit and Redis publish can no longer lose the event.
    session.add(
        OutboxEvent(
            event_type=event.event_type,
            payload=event.model_dump(mode="json"),
            idempotency_key=event.idempotency_key,
        )
    )
    await session.commit()

    # Best-effort SSE freshness notification AFTER commit (the authoritative delivery is the
    # outbox → stream path; a failure here must never roll back the graded result).
    try:
        from judge.routes.sse import publish_judge_result

        await publish_judge_result(submission.id)
    except Exception:
        logger.exception("SSE result notification failed", submission_id=submission_id_str)

    logger.info(
        "Submission graded successfully",
        submission_id=submission_id_str,
        verdict=submission.verdict,
    )
    return GRADED


async def reconcile_stuck_judge_submissions(
    ctx: dict[Any, Any], *args: object, **kwargs: object
) -> int:
    """Cron: recover submissions stuck in `processing` (worker hard-crash between claim and
    outcome). Only rows older than the reclaim window + a full wall budget are touched, so a
    legitimately executing sandbox is never reset. A reclaimed message (or a later delivery)
    then re-claims and reprocesses them.
    """
    from platform_core.core.config import settings

    stuck_threshold_s = (settings.JUDGE_RECLAIM_IDLE_MS / 1000) + (
        settings.JUDGE_SANDBOX_WALL_GRACE_SECONDS * 2
    )
    cutoff = datetime.now(UTC).timestamp() - stuck_threshold_s

    from platform_core.core.db.session import session_scope

    async with session_scope() as session:
        result = await session.execute(
            update(Submission)
            .where(
                Submission.status == "processing",
                Submission.updated_at.is_not(None),
                func.extract("epoch", Submission.updated_at) < cutoff,
            )
            .values(status="queued", error="reclaimed after worker interruption")
            .returning(Submission.id)
        )
        await session.commit()
        ids = list(result.scalars().all())
    if ids:
        logger.warning(
            "Reconciled stuck judge submissions", count=len(ids), ids=[str(i) for i in ids]
        )
    return len(ids)
