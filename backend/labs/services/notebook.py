"""Notebook engine service (B6) — request-path orchestration for the guided-lab notebook.

Error discipline mirrors judge (F-13): domain failures raise AppError subclasses so the API
answers a proper 4xx, never a bare ValueError → 500.

Execution semantics (§5 never-inline): `execute_cell` does NOT run Python. It pins the
learner's session, snapshots the source, creates a `queued` `LabCellExecution` row, and writes
one message to the labs Redis stream. The labs worker (a separate process) claims, runs in the
shared sandbox, and persists the bounded output — the request returns 202 with the execution
handle for the client to poll.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from labs.models import LabCell, LabVersion, UserLabProgress
from labs.repositories.checkpoint import CheckpointRepository
from labs.repositories.execution import ExecutionRepository
from labs.repositories.lab import LabRepository
from labs.repositories.progress import ProgressRepository
from labs.repositories.version import LabVersionRepository
from platform_core.contracts.labs import (
    CellExecutionAccepted,
    CellExecutionState,
    CheckpointResult,
    ExecuteCellRequest,
    LabCompleteResult,
    LabProgress,
    LabProgressSaveResult,
    SaveProgressRequest,
)
from platform_core.core.exceptions import ConflictError, ResourceNotFound
from platform_core.core.models.user import User
from platform_core.core.redis import AsyncRedis
from platform_core.events.models import OutboxEvent
from platform_core.events.schema import LabSessionCompletedEvent

LABS_QUEUE_STREAM = "zapsters:labs:queue"
MAX_CELL_SOURCE_BYTES = 65536


class NotebookService:
    def __init__(self, session: AsyncSession, redis: AsyncRedis | None = None) -> None:
        self._session = session
        self._labs = LabRepository(session)
        self._versions = LabVersionRepository(session)
        self._progress = ProgressRepository(session)
        self._executions = ExecutionRepository(session)
        self._checkpoints = CheckpointRepository(session)
        if redis is None:
            from platform_core.core.redis import get_redis_client

            redis = get_redis_client()
        self._redis = redis

    # -- helpers ---------------------------------------------------------------------------

    async def _resolve_lab_id(self, identifier: str, *, user: User) -> uuid.UUID:
        lab = await self._labs.get_visible_by_slug_or_id(identifier, org_id=user.org_id)
        if lab is None:
            raise ResourceNotFound("Lab not found.")
        return lab.id

    async def _published_version_or_raise(self, lab_id: uuid.UUID) -> LabVersion:
        version = await self._versions.get_published_with_content(lab_id)
        if version is None:
            raise ConflictError("This lab has no published notebook content.")
        return version

    async def _progress_or_create(
        self, lab_id: uuid.UUID, *, user: User
    ) -> UserLabProgress:
        version = await self._published_version_or_raise(lab_id)
        return await self._progress.get_or_create(
            lab_id,
            version_id=version.id,
            user_id=user.id,
            org_id=user.org_id,
        )

    @staticmethod
    def _code_cells(version: LabVersion) -> list[LabCell]:
        return [
            cell
            for section in version.sections
            for cell in section.cells
            if cell.cell_type == "code"
        ]

    @staticmethod
    def _code_cell_map(version: LabVersion) -> dict[uuid.UUID, LabCell]:
        return {
            cell.id: cell
            for section in version.sections
            for cell in section.cells
            if cell.cell_type == "code"
        }

    # -- read/progress ---------------------------------------------------------------------

    async def get_progress(self, identifier: str, *, user: User) -> LabProgress:
        lab_id = await self._resolve_lab_id(identifier, user=user)
        progress = await self._progress.get_or_create(
            lab_id,
            version_id=(await self._published_version_or_raise(lab_id)).id,
            user_id=user.id,
            org_id=user.org_id,
        )
        version = await self._versions.get_by_id(progress.version_id)
        if version is None:
            raise ConflictError("This lab has no published notebook content.")
        outputs = await self._executions.latest_for_progress(progress.id)
        await self._session.flush()
        await self._session.commit()
        return LabProgress(
            progress_id=progress.id,
            lab_id=lab_id,
            version=version.version,
            user_id=user.id,
            status=progress.status,
            code=dict(progress.code),
            outputs={
                str(row.cell_id): CellExecutionState(
                    execution_id=row.id,
                    status=row.status,
                    stdout=row.stdout,
                    stderr=row.stderr,
                    exit_code=row.exit_code,
                    runtime_ms=row.runtime_ms,
                    memory_kb=row.memory_kb,
                    error=row.error,
                    executed_at=row.executed_at,
                    updated_at=row.updated_at,
                )
                for row in outputs
            },
            hints_used=progress.hints_used,
            started_at=progress.started_at,
            updated_at=progress.updated_at,
            completed_at=progress.completed_at,
        )

    async def save_progress(
        self, identifier: str, data: SaveProgressRequest, *, user: User
    ) -> LabProgressSaveResult:
        lab_id = await self._resolve_lab_id(identifier, user=user)
        progress = await self._progress_or_create(lab_id, user=user)
        saved = await self._progress.save_code(progress.id, data.code)
        if saved is None:
            raise ResourceNotFound("Progress not found.")
        await self._session.commit()
        return LabProgressSaveResult(progress_id=saved.id, updated_at=saved.updated_at)

    # -- execution ------------------------------------------------------------------------

    async def execute_cell(
        self, identifier: str, request: ExecuteCellRequest, *, user: User
    ) -> CellExecutionAccepted:
        lab_id = await self._resolve_lab_id(identifier, user=user)
        version = await self._published_version_or_raise(lab_id)
        progress = await self._progress_or_create(lab_id, user=user)

        if progress.status == "completed":
            raise ConflictError("This lab is already completed.")

        code_cells = self._code_cell_map(version)
        cell = code_cells.get(request.cell_id)
        if cell is None:
            raise ResourceNotFound("Cell not found.")

        if request.code is not None and len(request.code.encode("utf-8")) > MAX_CELL_SOURCE_BYTES:
            raise ConflictError("Cell source exceeds maximum size of 64KB")

        source = (
            request.code
            if request.code is not None
            else progress.code.get(str(cell.id), cell.content)
        )

        execution = await self._executions.create(
            progress_id=progress.id,
            cell_id=cell.id,
            user_id=user.id,
            org_id=user.org_id,
            source_code=source,
            status="queued",
        )
        await self._session.flush()
        # Persist the queued execution BEFORE the stream message exists: the worker claims the
        # row with its own committed connection, so an uncommitted row would be invisible to it
        # (and the message would later be skipped). A crash after commit loses at most the
        # stream message (the UI simply re-runs); the reverse order could strand a message.
        await self._session.commit()
        await self._redis.xadd(LABS_QUEUE_STREAM, {"execution_id": str(execution.id)})

        return CellExecutionAccepted(
            execution_id=execution.id,
            cell_id=cell.id,
            received_at=execution.created_at,
        )

    # -- checkpoints ----------------------------------------------------------------------

    async def create_checkpoint(
        self, identifier: str, *, user: User, label: str = ""
    ) -> CheckpointResult:
        lab_id = await self._resolve_lab_id(identifier, user=user)
        progress = await self._progress_or_create(lab_id, user=user)
        outputs = await self._executions.latest_for_progress(progress.id)
        checkpoint = await self._checkpoints.create(
            progress_id=progress.id,
            label=label,
            snapshot={
                "code": dict(progress.code),
                "outputs": {
                    str(row.cell_id): {
                        "status": row.status,
                        "stdout": row.stdout,
                        "stderr": row.stderr,
                        "exit_code": row.exit_code,
                        "runtime_ms": row.runtime_ms,
                        "memory_kb": row.memory_kb,
                        "error": row.error,
                        "executed_at": row.executed_at.isoformat() if row.executed_at else None,
                    }
                    for row in outputs
                },
            },
        )
        await self._session.flush()
        await self._session.commit()
        return CheckpointResult(checkpoint_id=checkpoint.id, created_at=checkpoint.created_at)

    # -- completion -----------------------------------------------------------------------

    async def complete_lab(self, identifier: str, *, user: User) -> LabCompleteResult:
        lab_id = await self._resolve_lab_id(identifier, user=user)
        version = await self._published_version_or_raise(lab_id)
        progress = await self._progress_or_create(lab_id, user=user)

        code_cells = self._code_cells(version)
        succeeded: list[str] = []
        for cell in code_cells:
            latest = await self._executions.latest_for_cell(progress.id, cell.id)
            if latest is None or latest.status != "succeeded":
                raise ConflictError(
                    "Every code cell must run successfully before the lab can be completed."
                )
            succeeded.append(str(cell.id))

        if progress.status == "completed" and progress.completed_at is not None:
            # Idempotent replay of the completion endpoint: the event was already emitted on
            # first completion, so return the same outcome without double-emitting.
            pass
        else:
            now = datetime.now(UTC)
            completed = await self._progress.mark_completed(progress.id, completed_at=now)
            if completed is None:
                raise ConflictError("This lab is already completed.")
            event = LabSessionCompletedEvent(
                user_id=user.id,
                org_id=user.org_id,
                idempotency_key=f"lab:{progress.id}",
                session_fingerprint=f"auth:{user.id}",
                lab_id=lab_id,
                session_id=progress.id,
                objectives_completed=succeeded,
                time_taken_seconds=0,
                hints_used=progress.hints_used,
                payload={
                    "lab_id": str(lab_id),
                    "objectives_completed": succeeded,
                    "hints_used": progress.hints_used,
                },
            )
            # The completion event rides the outbox in the SAME transaction as the state
            # change (mirrors course completion and judge grading — F-12); a crash between
            # commit and bus publish can never lose it.
            self._session.add(
                OutboxEvent(
                    event_type=event.event_type,
                    payload=event.model_dump(mode="json"),
                    idempotency_key=event.idempotency_key,
                )
            )
            await self._session.flush()

        await self._session.commit()

        started_at = progress.started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=UTC)
        time_taken = max(0, int((datetime.now(UTC) - started_at).total_seconds()))

        return LabCompleteResult(
            lab_id=lab_id,
            session_id=progress.id,
            objectives_completed=succeeded,
            time_taken_seconds=time_taken,
            hints_used=progress.hints_used,
        )