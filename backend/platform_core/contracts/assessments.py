"""Assessment Engine contracts (platform §2.6, §4.1; gamification §7.6) — mirrors
`lib/contracts/assessment.ts`.

Grading is deterministic, never AI: exact/fuzzy-match for MCQ/short-answer, code questions
delegate to the Judge Engine (one grading truth). The combo the client sees is always a preview
— the server is the only thing that can turn it into real XP.
"""

from datetime import datetime
from typing import Annotated, Literal, Protocol
from uuid import UUID

from pydantic import BaseModel, Field

from platform_core.events.schema import AssessmentSubmittedEvent as AssessmentSubmittedEvent

QuestionType = Literal["mcq", "short_answer", "code"]
QuestionDifficulty = Literal["easy", "medium", "hard"]
AttemptStatus = Literal["in_progress", "submitted", "expired", "abandoned"]
TelemetryType = Literal["tab_visibility", "paste", "focus_blur"]


class AssessmentQuestion(BaseModel):
    id: UUID
    type: QuestionType
    difficulty: QuestionDifficulty
    prompt: str
    options: list[str] | None = None
    accepted_answers: list[str] | None = None
    starter_code: str | None = None
    reference_solution: str | None = None


class Assessment(BaseModel):
    id: UUID
    slug: str
    title: str
    category: str
    description: str
    version: int
    estimated_minutes: int
    attempts_allowed: int
    passing_percent: float
    questions: list[AssessmentQuestion]


class McqAnswer(BaseModel):
    option_index: int


class ShortAnswerAnswer(BaseModel):
    text: str


class CodeAnswer(BaseModel):
    source_code: str


AssessmentAnswer = Annotated[
    McqAnswer | ShortAnswerAnswer | CodeAnswer, Field(union_mode="left_to_right")
]


class AssessmentSubmission(BaseModel):
    attempt_id: UUID
    question_id: UUID
    user_id: UUID
    type: QuestionType
    answer: AssessmentAnswer
    time_spent_ms: int


class ComboState(BaseModel):
    """Server-derived combo view — the client only previews it (§7.6)."""

    count: int
    multiplier: float
    best: int


class GradeResult(BaseModel):
    attempt_id: UUID
    question_id: UUID
    correct: bool
    score: float
    feedback: str
    combo: ComboState


class AttemptAnswer(BaseModel):
    question_id: UUID
    correct: bool
    score: float
    submitted_at: datetime


class AssessmentAttempt(BaseModel):
    attempt_id: UUID
    assessment_id: UUID
    user_id: UUID
    status: AttemptStatus
    attempt_number: int
    started_at: datetime
    expires_at: datetime
    answers: list[AttemptAnswer]
    score: float
    integrity_flags: list[str]
    submitted_at: datetime | None
    total_score: float = 0
    passed: bool = False


class AssessmentAttemptSummary(BaseModel):
    attempt_id: UUID
    attempt_number: int
    status: AttemptStatus
    score: float
    passed: bool
    correct_count: int
    question_count: int
    max_combo: int
    submitted_at: datetime | None


class TelemetryEvent(BaseModel):
    attempt_id: UUID
    type: TelemetryType
    detail: str
    occurred_at: datetime


class AssessmentEngine(Protocol):
    """Platform §4.1 — locked verbatim."""

    async def submit_answer(self, submission: AssessmentSubmission) -> GradeResult: ...
