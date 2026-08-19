"""Lab Engine contracts (platform §2.5, §4.1, §4.3, §6) — mirrors `lib/contracts/lab.ts`.

Objective verification is always a scoped server-side read against the session's real state,
never a value the browser claims (§6) — `check_objective`'s signature is locked by the doc for
exactly this reason.
"""

from datetime import datetime
from typing import Literal, Protocol
from uuid import UUID

from pydantic import BaseModel

from platform_core.events.schema import LabSessionCompletedEvent as LabSessionCompletedEvent

LabDifficulty = Literal["beginner", "intermediate", "advanced"]
LabSessionStatus = Literal["provisioning", "running", "completed", "timed_out", "terminated"]


class LabObjective(BaseModel):
    id: str
    title: str
    description: str
    hints: list[str]
    requires_terminal: bool


class Lab(BaseModel):
    id: UUID
    slug: str
    title: str
    category: str
    difficulty: LabDifficulty
    description: str
    estimated_minutes: int
    success_rate_pct: float
    requires_gui: bool
    hard_timeout_minutes: int
    objectives: list[LabObjective]


class ObjectiveResult(BaseModel):
    objective_id: str
    completed: bool
    verified_at: datetime | None
    detail: str


class LabSession(BaseModel):
    session_id: UUID
    lab_id: UUID
    user_id: UUID
    status: LabSessionStatus
    provisioned_at: datetime
    expires_at: datetime
    objectives_completed: list[str]
    checks: list[ObjectiveResult]
    hints_used: int
    terminal_url: str
    ended_at: datetime | None


class LabPreviewSession(BaseModel):
    """Public, non-persistent terminal session for the unauthenticated try-it mode."""

    session_id: UUID
    lab_id: UUID
    status: Literal["running"] = "running"
    expires_at: datetime
    terminal_url: str
    read_only: Literal[True] = True


# --- Notebook engine (B6) ----------------------------------------------------------------------


class LabCellView(BaseModel):
    id: UUID
    cell_type: Literal["markdown", "code"]
    content: str
    position: int


class LabSectionView(BaseModel):
    id: UUID
    title: str
    position: int
    cells: list[LabCellView]


class LabVersionView(BaseModel):
    version: int
    sections: list[LabSectionView]


class LabDetail(Lab):
    """A lab's catalog card plus its published notebook manifest, if one exists."""

    notebook: LabVersionView | None = None


class CellExecutionState(BaseModel):
    """Latest execution state for one cell in a learner's session. `not_run` is the
    implicit state for cells with no execution row yet."""

    execution_id: UUID | None = None
    status: Literal["not_run", "queued", "processing", "succeeded", "failed", "error"]
    stdout: str | None = None
    stderr: str | None = None
    exit_code: int | None = None
    runtime_ms: int | None = None
    memory_kb: int | None = None
    error: str | None = None
    executed_at: datetime | None = None
    updated_at: datetime | None = None


class LabProgress(BaseModel):
    progress_id: UUID
    lab_id: UUID
    version: int
    user_id: UUID
    status: Literal["in_progress", "completed"]
    code: dict[str, str]
    outputs: dict[str, CellExecutionState]
    hints_used: int
    started_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class ExecuteCellRequest(BaseModel):
    cell_id: UUID
    # Optional snapshot to run; when omitted the server runs the autosaved code for the cell
    # (or the cell's starter content if the learner has not touched it).
    code: str | None = None


class CellExecutionAccepted(BaseModel):
    execution_id: UUID
    cell_id: UUID
    status: Literal["queued"] = "queued"
    received_at: datetime


class SaveProgressRequest(BaseModel):
    """Debounced autosave of the learner's cell sources."""

    code: dict[str, str]


class LabProgressSaveResult(BaseModel):
    progress_id: UUID
    updated_at: datetime


class CheckpointRequest(BaseModel):
    label: str = ""


class CheckpointResult(BaseModel):
    checkpoint_id: UUID
    created_at: datetime


class LabCompleteResult(BaseModel):
    lab_id: UUID
    session_id: UUID
    objectives_completed: list[str]
    time_taken_seconds: int
    hints_used: int


class LabEngine(Protocol):
    """Platform §4.1 — locked verbatim."""

    async def provision_session(self, lab_id: UUID, user_id: UUID) -> LabSession: ...

    async def terminate_session(self, session_id: UUID) -> None: ...

    async def check_objective(self, session_id: UUID, objective_id: str) -> ObjectiveResult: ...
