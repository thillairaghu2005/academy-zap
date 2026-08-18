import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from judge.repositories.submission import SubmissionRepository
from platform_core.contracts.judge import (
    CodeSubmission,
    JudgeResult,
    JudgeResultCase,
    SubmissionAccepted,
)
from platform_core.core.exceptions import ResourceNotFound
from platform_core.core.redis import get_redis_client

JUDGE_QUEUE_STREAM = "zapsters:judge:queue"


class SubmissionService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = SubmissionRepository(session)
        self._redis = get_redis_client()

    async def submit(self, submission: CodeSubmission) -> SubmissionAccepted:
        # Validate source code size
        if len(submission.source_code.encode("utf-8")) > 65536:
            raise ValueError("Source code exceeds maximum size of 64KB")

        if submission.language != "python":
            raise ValueError(f"Language {submission.language} is not supported")

        row = await self._repo.create(
            problem_id=submission.problem_id,
            user_id=submission.user_id,
            language=submission.language,
            source_code=submission.source_code,
            status="queued",
            test_cases_passed=0,
            test_cases_total=0,
        )

        await self._redis.xadd(
            JUDGE_QUEUE_STREAM,
            {"submission_id": str(row.id)},
        )

        return SubmissionAccepted(
            submission_id=row.id,
            status="queued",
            received_at=row.created_at,
        )

    async def get_result(self, submission_id: uuid.UUID) -> JudgeResult:
        row = await self._repo.get_by_id(submission_id)
        if not row:
            raise ResourceNotFound("Submission not found")
            
        if row.status != "graded":
            raise ResourceNotFound("Submission not graded yet")

        cases = None
        if row.cases:
            cases = [JudgeResultCase(**c) for c in row.cases]

        return JudgeResult(
            submission_id=row.id,
            problem_id=row.problem_id,
            verdict=row.verdict or "accepted",  # Default if still queued? Wait, frontend expects accurate verdict
            runtime_ms=row.runtime_ms or 0,
            memory_kb=row.memory_kb or 0,
            test_cases_passed=row.test_cases_passed,
            test_cases_total=row.test_cases_total,
            stdout=row.stdout or "",
            stderr=row.stderr,
            compile_output=row.compile_output,
            cases=cases,
            graded_at=row.graded_at or datetime.now(UTC),
        )
