"""Attempt/grade — 501 stubs. Grading is deterministic (never AI), and code questions delegate
to the Judge Engine (one grading truth per platform §2.6) — neither exists yet this round.
"""

import uuid

from fastapi import APIRouter

from assessments.schemas.attempt import (
    AssessmentAttempt,
    AssessmentAttemptSummary,
    AssessmentResult,
    GradeResult,
    SubmitMcqAnswer,
    TelemetryInput,
)
from assessments.services.attempt import AttemptService
from platform_core.core.deps import CurrentUser, DbSession, RedisClient

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.post("/{assessment_id}/attempts", response_model=AssessmentAttempt, status_code=201)
async def start_attempt(
    assessment_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> AssessmentAttempt:
    return await AttemptService(session).start(
        assessment_id, current_user.id, current_user.org_id
    )


@router.post("/attempts/{attempt_id}/submit", response_model=GradeResult)
async def submit_answer(
    attempt_id: uuid.UUID,
    submission: SubmitMcqAnswer,
    session: DbSession,
    current_user: CurrentUser,
) -> GradeResult:
    return await AttemptService(session).submit_answer(attempt_id, current_user.id, submission)


@router.get("/attempts/{attempt_id}", response_model=AssessmentAttempt)
async def get_attempt(
    attempt_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> AssessmentAttempt:
    return await AttemptService(session).get(attempt_id, current_user.id)


@router.get("/{assessment_id}/attempts", response_model=list[AssessmentAttemptSummary])
async def list_attempts(
    assessment_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> list[AssessmentAttemptSummary]:
    return await AttemptService(session).list(assessment_id, current_user.id)


@router.post("/attempts/{attempt_id}/submit-final", response_model=AssessmentResult)
async def submit_final(
    attempt_id: uuid.UUID,
    session: DbSession,
    redis: RedisClient,
    current_user: CurrentUser,
) -> AssessmentResult:
    return await AttemptService(session, redis).submit(
        attempt_id, current_user.id, current_user.org_id
    )


@router.post("/attempts/{attempt_id}/telemetry", status_code=204)
async def record_telemetry(
    attempt_id: uuid.UUID,
    data: TelemetryInput,
    session: DbSession,
    current_user: CurrentUser,
) -> None:
    await AttemptService(session).record_telemetry(attempt_id, current_user.id, data)
