"""Session provisioning/objective-checking — 501 stubs. Requires the Kata/Firecracker
orchestrator and the default-deny NetworkPolicy control plane (build.md B6); there is nothing
safe to fake here — a provisioned-in-name-only session would be a lab that looks live but has no
real isolation behind it.
"""

import uuid

from fastapi import APIRouter

from platform_core.contracts.labs import LabSession, ObjectiveResult
from platform_core.core.deps import CurrentUser
from platform_core.core.exceptions import NotImplementedFoundationError

router = APIRouter(prefix="/labs", tags=["labs"])


@router.post("/{lab_id}/sessions", response_model=LabSession, status_code=202)
async def provision_session(lab_id: uuid.UUID, _current_user: CurrentUser) -> LabSession:
    raise NotImplementedFoundationError("labs", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §6")


@router.delete("/sessions/{session_id}", status_code=204)
async def terminate_session(session_id: uuid.UUID, _current_user: CurrentUser) -> None:
    raise NotImplementedFoundationError("labs", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §6")


@router.post(
    "/sessions/{session_id}/objectives/{objective_id}/check", response_model=ObjectiveResult
)
async def check_objective(
    session_id: uuid.UUID, objective_id: str, _current_user: CurrentUser
) -> ObjectiveResult:
    raise NotImplementedFoundationError("labs", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §6")
