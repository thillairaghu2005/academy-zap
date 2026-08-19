"""Labs notebook cell execution executor — the unit of work the labs queue polls (B6).

Reliability contract mirrors the judge grader (slice 10 F-9/F-10):
- Claim is ATOMIC: `UPDATE ... WHERE status='queued' RETURNING` — only one worker can run a
  given cell; a concurrent delivery observes zero rows and skips (no double execution).
- Crash recovery: a reclaimed message whose row is stuck in `processing` (previous worker died
  mid-run) is reset to `queued` and re-claimed. Safe because reclaim only happens after the
  sandbox wall budget (`LABS_RECLAIM_IDLE_MS`) has elapsed.
- Execution exceptions propagate to the queue layer, which decides retry vs dead-letter — a
  sandbox outage is never recorded as a cell result.
- A `succeeded` run has `exit_code == 0`; `failed` means the learner's code ran and returned
  non-zero (a legit output the notebook shows) — both are terminal and ACKable.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from sqlalchemy import func, update
from sqlalchemy.ext.asyncio import AsyncSession

from judge.orchestrator.sandbox import SandboxOrchestrator, get_sandbox
from labs.models import LabCellExecution
from labs.repositories.execution import ExecutionRepository
from platform_core.core.config import settings

logger = structlog.get_logger(__name__)

# Outcomes returned to the queue layer.
EXECUTED = "executed"  # sandbox ran and the result was persisted — safe to ACK
SKIPPED = "skipped"  # terminal/already-handled/not-found — safe to ACK


async def execute_lab_cell(session: AsyncSession, execution_id_str: str) -> str:
    execution_id = uuid.UUID(execution_id_str)
    repo = ExecutionRepository(session)

    execution = await repo.get_by_id(execution_id)
    if execution is None:
        logger.error("Cell execution not found", execution_id=execution_id_str)
        return SKIPPED

    if execution.status in ("succeeded", "failed", "error"):
        logger.info(
            "Cell execution already terminal",
            execution_id=execution_id_str,
            status=execution.status,
        )
        return SKIPPED

    if execution.status == "processing":
        # Reclaimed delivery after a worker crash mid-run; the wall budget has elapsed, so the
        # previous attempt cannot still be executing — reset and re-claim.
        logger.warning("Resetting stuck processing cell execution", execution_id=execution_id_str)
        execution.status = "queued"
        execution.error = None
        await session.commit()

    claimed = await repo.claim_processing(execution_id)
    if not claimed:
        logger.info(
            "Cell execution claim lost to another worker", execution_id=execution_id_str
        )
        return SKIPPED

    sandbox: SandboxOrchestrator = get_sandbox()
    try:
        result = await sandbox.run(
            execution.source_code,
            "python",
            input_data="",
            time_limit_ms=settings.LAB_CELL_TIME_LIMIT_MS,
            memory_limit_kb=settings.JUDGE_SANDBOX_MEMORY_LIMIT_MB * 1024,
        )
    except Exception as exc:
        # Sandbox/infrastructure failure. Record it, reset to queued so the reclaimed message
        # retries, and re-raise — the queue layer owns retry counting / dead-lettering.
        logger.exception(
            "Cell execution sandbox failed", execution_id=execution_id_str, error=str(exc)
        )
        execution.status = "queued"
        execution.error = f"sandbox failure: {exc}"
        await session.commit()
        raise

    status = "succeeded" if result["exit_code"] == 0 else "failed"
    await repo.mark_result(
        execution_id,
        status=status,
        stdout=result["stdout"],
        stderr=result["stderr"],
        exit_code=result["exit_code"],
        runtime_ms=result["runtime_ms"],
        memory_kb=result["memory_kb"],
        error=None,
    )
    execution.status = status
    execution.executed_at = datetime.now(UTC)
    await session.commit()

    logger.info(
        "Cell executed successfully",
        execution_id=execution_id_str,
        status=status,
        exit_code=result["exit_code"],
        runtime_ms=result["runtime_ms"],
    )
    return EXECUTED


async def reconcile_stuck_lab_executions(
    ctx: dict[Any, Any], *args: object, **kwargs: object
) -> int:
    """Cron: recover cell executions stuck in `processing` (worker hard-crash between claim and
    outcome). Only rows older than the reclaim window + a full wall budget are touched, so a
    legitimately executing sandbox is never reset.
    """
    from datetime import datetime as _datetime

    stuck_threshold_s = (settings.LABS_RECLAIM_IDLE_MS / 1000) + (
        settings.JUDGE_SANDBOX_WALL_GRACE_SECONDS * 2
    )
    cutoff = _datetime.now(UTC).timestamp() - stuck_threshold_s

    from platform_core.core.db.session import session_scope

    async with session_scope() as session:
        result = await session.execute(
            update(LabCellExecution)
            .where(
                LabCellExecution.status == "processing",
                LabCellExecution.updated_at.is_not(None),
                func.extract("epoch", LabCellExecution.updated_at) < cutoff,
            )
            .values(status="queued", error="reclaimed after worker interruption")
            .returning(LabCellExecution.id)
        )
        await session.commit()
        ids = list(result.scalars().all())
    if ids:
        logger.warning(
            "Reconciled stuck lab cell executions", count=len(ids), ids=[str(i) for i in ids]
        )
    return len(ids)