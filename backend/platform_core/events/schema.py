"""The cross-subsystem event contract — the ONLY coupling between subsystems (platform §4.3,
gamification §4). Every event carries `event_id`, `schema_version`, `idempotency_key`,
`session_fingerprint`. A redelivered event is a no-op (see `platform_core/events/idempotency.py`).
A schema change bumps `schema_version` and updates every consumer in the same PR.

Literal event types, verbatim from build.md §8 B1: `course.completed`, `assessment.submitted`,
`side_assessment.submitted`, `login.recorded`, `judge.submission_graded`,
`lab.session_completed`, `payment.succeeded`.

Note: the gamification doc's own §4 Pydantic model uses a single `assessment.submitted` literal
distinguished by an `assessment_kind: Literal["main", "side"]` field, while build.md's event list
names `side_assessment.submitted` as if it were a second literal. The doc's schema (§4) is the
locked source; `AssessmentSubmittedEvent` here follows it exactly, and `side_assessment.submitted`
is accepted as an alternate `event_type` value on the same class rather than a second class, so
both sources are satisfied without inventing a second shape.
"""

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator

from platform_core.contracts.judge import Verdict


class BaseEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    event_type: str
    schema_version: int = 1
    user_id: UUID
    org_id: UUID | None = None
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    idempotency_key: str = Field(min_length=1, max_length=200)
    session_fingerprint: str = Field(min_length=1, max_length=256)
    payload: dict[str, Any] = Field(default_factory=dict)


class CourseCompletedEvent(BaseEvent):
    event_type: Literal["course.completed"] = "course.completed"
    course_id: UUID
    category: str
    time_spent_seconds: int
    # Not a typing.Literal: PEP 586 only allows bool/int/str/bytes/enum/None as literal values,
    # and the completion signal is a float percentage. Enforced by validator instead — partial
    # completions never fire this event (gamification §4).
    completion_pct: float = 100.0

    @field_validator("completion_pct")
    @classmethod
    def _must_be_full_completion(cls, v: float) -> float:
        if v != 100.0:
            raise ValueError("CourseCompletedEvent.completion_pct must be exactly 100.0")
        return v

    @field_validator("time_spent_seconds")
    @classmethod
    def _time_must_be_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("time_spent_seconds must be non-negative")
        return v


class AssessmentSubmittedEvent(BaseEvent):
    event_type: Literal["assessment.submitted", "side_assessment.submitted"] = (
        "assessment.submitted"
    )
    assessment_id: UUID
    assessment_kind: Literal["main", "side"]
    score_pct: float
    max_score: float
    time_taken_seconds: int
    attempt_number: int
    question_level_answers: list[dict[str, Any]]

    @field_validator("score_pct")
    @classmethod
    def _score_must_be_a_percentage(cls, v: float) -> float:
        if not 0 <= v <= 100:
            raise ValueError("score_pct must be between 0 and 100")
        return v

    @field_validator("max_score")
    @classmethod
    def _max_score_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("max_score must be greater than zero")
        return v

    @field_validator("time_taken_seconds")
    @classmethod
    def _time_taken_must_be_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("time_taken_seconds must be non-negative")
        return v

    @field_validator("attempt_number")
    @classmethod
    def _attempt_number_must_be_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("attempt_number must be greater than zero")
        return v


class LoginRecordedEvent(BaseEvent):
    event_type: Literal["login.recorded"] = "login.recorded"


class JudgeSubmissionGradedEvent(BaseEvent):
    """Platform §4.3 — locked verbatim."""

    event_type: Literal["judge.submission_graded"] = "judge.submission_graded"
    submission_id: UUID
    problem_id: UUID
    verdict: Verdict
    runtime_ms: int
    memory_kb: int
    test_cases_passed: int
    test_cases_total: int


class LabSessionCompletedEvent(BaseEvent):
    """Platform §4.3 — locked verbatim."""

    event_type: Literal["lab.session_completed"] = "lab.session_completed"
    lab_id: UUID
    session_id: UUID
    objectives_completed: list[str]
    time_taken_seconds: int
    hints_used: int


class PaymentSucceededEvent(BaseEvent):
    event_type: Literal["payment.succeeded"] = "payment.succeeded"
    checkout_id: UUID
    order_id: UUID
    amount_cents: int
    currency: str
    provider: Literal["razorpay", "stripe"]


ZapstersEvent = (
    CourseCompletedEvent
    | AssessmentSubmittedEvent
    | LoginRecordedEvent
    | JudgeSubmissionGradedEvent
    | LabSessionCompletedEvent
    | PaymentSucceededEvent
)

EVENT_TYPE_REGISTRY: dict[str, type[BaseEvent]] = {
    "course.completed": CourseCompletedEvent,
    "assessment.submitted": AssessmentSubmittedEvent,
    "side_assessment.submitted": AssessmentSubmittedEvent,
    "login.recorded": LoginRecordedEvent,
    "judge.submission_graded": JudgeSubmissionGradedEvent,
    "lab.session_completed": LabSessionCompletedEvent,
    "payment.succeeded": PaymentSucceededEvent,
}
