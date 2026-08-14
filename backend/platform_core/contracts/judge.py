"""Judge Engine contracts (platform §2.4, §4.1, §4.3, §5) — mirrors `lib/contracts/judge.ts`.

Verdict literals are verbatim from the event schema (§4.3); `submit`/`get_result` signatures are
locked by the `JudgeEngine` Protocol.
"""

from datetime import datetime
from typing import Literal, Protocol
from uuid import UUID

from pydantic import BaseModel

Verdict = Literal[
    "accepted", "wrong_answer", "time_limit_exceeded", "runtime_error", "compile_error"
]
ProblemDifficulty = Literal["easy", "medium", "hard"]
JudgeLanguage = Literal["python", "java", "javascript", "cpp"]
SubmissionStatus = Literal["queued", "graded"]


class CodeSubmission(BaseModel):
    problem_id: UUID
    user_id: UUID
    language: JudgeLanguage
    source_code: str


class SubmissionAccepted(BaseModel):
    """202 envelope — the request is queued, never executed inline (§5.3)."""

    submission_id: UUID
    status: SubmissionStatus
    received_at: datetime


class JudgeResultCase(BaseModel):
    index: int
    status: Verdict
    hidden: bool
    runtime_ms: int
    memory_kb: int
    input: str | None = None
    expected: str | None = None
    received: str | None = None


class JudgeResult(BaseModel):
    """Mirrors JudgeSubmissionGradedEvent + raw output (§4.3, §5.6 "never discard raw")."""

    submission_id: UUID
    problem_id: UUID
    verdict: Verdict
    runtime_ms: int
    memory_kb: int
    test_cases_passed: int
    test_cases_total: int
    stdout: str
    stderr: str | None
    compile_output: str | None
    cases: list[JudgeResultCase] | None = None
    graded_at: datetime


class SampleCase(BaseModel):
    input: str
    output: str
    explanation: str | None = None


class Problem(BaseModel):
    id: UUID
    slug: str
    title: str
    difficulty: ProblemDifficulty
    estimated_minutes: int
    success_rate_pct: float
    topics: list[str]
    statement: str
    constraints: list[str]
    starter_code: str
    sample_cases: list[SampleCase]
    hidden_test_count: int
    time_limit_ms: int
    memory_limit_kb: int
    expected_solution: str | None = None


class JudgeEngine(Protocol):
    """Platform §4.1 — locked verbatim."""

    async def submit(self, submission: CodeSubmission) -> SubmissionAccepted: ...

    async def get_result(self, submission_id: UUID) -> JudgeResult | None: ...
