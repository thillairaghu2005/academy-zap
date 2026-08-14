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


class LabEngine(Protocol):
    """Platform §4.1 — locked verbatim."""

    async def provision_session(self, lab_id: UUID, user_id: UUID) -> LabSession: ...

    async def terminate_session(self, session_id: UUID) -> None: ...

    async def check_objective(self, session_id: UUID, objective_id: str) -> ObjectiveResult: ...
