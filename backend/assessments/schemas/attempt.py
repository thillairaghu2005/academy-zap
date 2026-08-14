import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from platform_core.contracts.assessments import (
    AssessmentAttempt,
    AssessmentAttemptSummary,
    GradeResult,
)


class SubmitMcqAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question_id: uuid.UUID
    option_index: int = Field(ge=0, le=100)
    time_spent_ms: int = Field(ge=0, le=86_400_000)


class TelemetryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str = Field(pattern="^(tab_visibility|paste|focus_blur)$")
    detail: str = Field(min_length=1, max_length=500)
    occurred_at: datetime


class AssessmentResult(BaseModel):
    attempt_id: uuid.UUID
    assessment_id: uuid.UUID
    score: float
    total_score: float
    correct_count: int
    question_count: int
    time_taken_seconds: int
    max_combo: int
    integrity_flags: list[str]
    passed: bool


__all__ = [
    "AssessmentAttempt",
    "AssessmentAttemptSummary",
    "AssessmentResult",
    "GradeResult",
    "SubmitMcqAnswer",
    "TelemetryInput",
]
