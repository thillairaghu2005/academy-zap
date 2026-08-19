"""Notebook engine routes (B6) — progress, autosave, cell execution, checkpoint, completion.

Execution is NEVER inline (platform §5): `POST /labs/{slug}/cell/execute` enqueues work and
answers 202 with the execution handle; a separate worker runs it in the sandbox. The route is
rate-limited per authenticated user (mirrors judge's submit route F-14).

Every mutation route is authenticated; progress/executions are ownership + tenant scoped at the
repository layer, so a foreign learner's session is indistinguishable from a missing one (404).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from starlette.responses import Response

from labs.services.notebook import NotebookService
from platform_core.contracts.labs import (
    CellExecutionAccepted,
    CheckpointRequest,
    CheckpointResult,
    ExecuteCellRequest,
    LabCompleteResult,
    LabProgress,
    LabProgressSaveResult,
    SaveProgressRequest,
)
from platform_core.core.deps import CurrentUser, DbSession, RedisClient
from platform_core.core.rate_limiting import AuthenticatedRateLimiter
from platform_core.core.rate_limits import LABS_EXECUTE_RATE_LIMIT

router = APIRouter(prefix="/labs", tags=["labs"])

_labs_execute_rate_limit = AuthenticatedRateLimiter(
    times=LABS_EXECUTE_RATE_LIMIT.times,
    seconds=LABS_EXECUTE_RATE_LIMIT.seconds,
)


async def _labs_execute_rate_limited(
    request: Request,
    response: Response,
    _current_user: CurrentUser,
) -> None:
    """Per-user Redis-backed limit on cell executions (sandbox spin-ups are expensive)."""
    await _labs_execute_rate_limit.check_user(request, response, _current_user)


@router.get("/{identifier}/progress", response_model=LabProgress)
async def get_progress(
    identifier: str,
    _current_user: CurrentUser,
    session: DbSession,
) -> LabProgress:
    return await NotebookService(session).get_progress(identifier, user=_current_user)


@router.put("/{identifier}/progress", response_model=LabProgressSaveResult)
async def save_progress(
    identifier: str,
    data: SaveProgressRequest,
    _current_user: CurrentUser,
    session: DbSession,
) -> LabProgressSaveResult:
    return await NotebookService(session).save_progress(identifier, data, user=_current_user)


@router.post(
    "/{identifier}/cell/execute",
    response_model=CellExecutionAccepted,
    status_code=202,
)
async def execute_cell(
    identifier: str,
    request: ExecuteCellRequest,
    _current_user: CurrentUser,
    _rate_limited: Annotated[None, Depends(_labs_execute_rate_limited)],
    session: DbSession,
    redis: RedisClient,
) -> CellExecutionAccepted:
    return await NotebookService(session, redis).execute_cell(
        identifier, request, user=_current_user
    )


@router.post("/{identifier}/checkpoint", response_model=CheckpointResult)
async def create_checkpoint(
    identifier: str,
    data: CheckpointRequest,
    _current_user: CurrentUser,
    session: DbSession,
) -> CheckpointResult:
    return await NotebookService(session).create_checkpoint(
        identifier, user=_current_user, label=data.label
    )


@router.post("/{identifier}/complete", response_model=LabCompleteResult)
async def complete_lab(
    identifier: str,
    _current_user: CurrentUser,
    session: DbSession,
) -> LabCompleteResult:
    return await NotebookService(session).complete_lab(identifier, user=_current_user)