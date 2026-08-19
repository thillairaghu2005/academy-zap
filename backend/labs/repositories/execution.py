"""Lab cell execution repository (B6) — the worker's atomic claim target.

Mirrors judge's SubmissionRepository exactly: the API enqueues a `queued` row and one stream
message; the worker claims it with `UPDATE ... WHERE status='queued' RETURNING` so only one
worker can run a given cell; crash recovery resets a stuck `processing` row to `queued` and
re-claims it. `succeeded`/`failed` are terminal; `error` marks an exhausted-retry failure.
"""

import uuid
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from labs.models import LabCellExecution


class ExecutionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, **kwargs: object) -> LabCellExecution:
        execution = LabCellExecution(**kwargs)
        self._session.add(execution)
        await self._session.flush()
        return execution

    async def get_by_id(self, execution_id: uuid.UUID) -> LabCellExecution | None:
        """Unscoped read — worker path only."""
        result = await self._session.execute(
            select(LabCellExecution).where(LabCellExecution.id == execution_id)
        )
        return result.scalar_one_or_none()

    async def get_owned(
        self,
        execution_id: uuid.UUID,
        *,
        user_id: uuid.UUID,
        org_id: uuid.UUID | None,
    ) -> LabCellExecution | None:
        """API-facing read: owner + tenant must match, else None."""
        result = await self._session.execute(
            select(LabCellExecution).where(
                LabCellExecution.id == execution_id,
                LabCellExecution.user_id == user_id,
                _org_scope(LabCellExecution.org_id, org_id),
            )
        )
        return result.scalar_one_or_none()

    async def claim_processing(self, execution_id: uuid.UUID) -> bool:
        """Atomically claim a queued execution. True only for the worker that won."""
        result = await self._session.execute(
            update(LabCellExecution)
            .where(
                LabCellExecution.id == execution_id,
                LabCellExecution.status == "queued",
            )
            .values(status="processing", updated_at=func.now())
            .returning(LabCellExecution.id)
        )
        return result.scalar_one_or_none() is not None

    async def mark_result(
        self,
        execution_id: uuid.UUID,
        *,
        status: str,
        stdout: str | None,
        stderr: str | None,
        exit_code: int | None,
        runtime_ms: int | None,
        memory_kb: int | None,
        error: str | None = None,
    ) -> None:
        await self._session.execute(
            update(LabCellExecution)
            .where(LabCellExecution.id == execution_id)
            .values(
                status=status,
                stdout=stdout,
                stderr=stderr,
                exit_code=exit_code,
                runtime_ms=runtime_ms,
                memory_kb=memory_kb,
                error=error,
                executed_at=func.now(),
                updated_at=func.now(),
            )
        )

    async def mark_error(self, execution_id: uuid.UUID | None, message: str) -> None:
        if execution_id is None:
            return
        await self._session.execute(
            update(LabCellExecution)
            .where(LabCellExecution.id == execution_id)
            .values(status="error", error=message[:500], updated_at=func.now())
        )

    async def latest_for_cell(
        self,
        progress_id: uuid.UUID,
        cell_id: uuid.UUID,
    ) -> LabCellExecution | None:
        result = await self._session.execute(
            select(LabCellExecution)
            .where(
                LabCellExecution.progress_id == progress_id,
                LabCellExecution.cell_id == cell_id,
            )
            .order_by(LabCellExecution.created_at.desc(), LabCellExecution.id.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def latest_for_progress(self, progress_id: uuid.UUID) -> list[LabCellExecution]:
        """The most recent execution row per cell for a progress session (outputs view)."""
        result = await self._session.execute(
            select(LabCellExecution)
            .where(LabCellExecution.progress_id == progress_id)
            .order_by(LabCellExecution.cell_id, LabCellExecution.created_at.desc())
        )
        rows = list(result.scalars().all())
        latest: dict[uuid.UUID, LabCellExecution] = {}
        for row in rows:
            latest.setdefault(row.cell_id, row)
        return list(latest.values())


def _org_scope(column: Any, org_id: uuid.UUID | None) -> Any:
    if org_id is None:
        return column.is_(None)
    return column == org_id