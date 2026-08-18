"""Judge submission service — request-path orchestration.

Error discipline (slice 10 remediation F-13): every domain error raised here is an
`AppError` subclass so the API answers a proper 4xx, never a bare-ValueError 500:
- foreign-user submit attempt → PermissionDenied (403)
- unsupported language / oversized source → UnprocessableEntity (422)
- invisible problem / foreign submission read → ResourceNotFound (404)
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from judge.models import Submission
from judge.repositories.problem import ProblemRepository
from judge.repositories.submission import SubmissionRepository
from platform_core.contracts.judge import (
    CodeSubmission,
    JudgeResult,
    JudgeResultCase,
    SubmissionAccepted,
)
from platform_core.core.exceptions import (
    PermissionDenied,
    ResourceNotFound,
    UnprocessableEntity,
)
from platform_core.core.models.user import User
from platform_core.core.redis import AsyncRedis

JUDGE_QUEUE_STREAM = "zapsters:judge:queue"
MAX_SOURCE_BYTES = 65536
SUPPORTED_LANGUAGES = ("python",)


class SubmissionService:
    def __init__(self, session: AsyncSession, redis: AsyncRedis | None = None) -> None:
        self._repo = SubmissionRepository(session)
        self._problems = ProblemRepository(session)
        # Redis is injected so tests can pass fakeredis (SOP §12); the worker/queue layer
        # constructs the service without it and the module-level client is used (real Redis).
        if redis is None:
            from platform_core.core.redis import get_redis_client

            redis = get_redis_client()
        self._redis = redis

    async def submit(self, submission: CodeSubmission, *, user: User) -> SubmissionAccepted:
        # The request body must never let a caller act on behalf of another user.
        if submission.user_id != user.id:
            raise PermissionDenied("Cannot submit for another user")

        if submission.language not in SUPPORTED_LANGUAGES:
            raise UnprocessableEntity(f"Language {submission.language} is not supported")

        if len(submission.source_code.encode("utf-8")) > MAX_SOURCE_BYTES:
            raise UnprocessableEntity("Source code exceeds maximum size of 64KB")

        # Tenant check: the problem must be public or belong to the caller's org (F-6).
        problem = await self._problems.get_visible(submission.problem_id, org_id=user.org_id)
        if problem is None:
            raise ResourceNotFound("Problem not found")

        row = await self._repo.create(
            problem_id=submission.problem_id,
            user_id=submission.user_id,
            org_id=user.org_id,
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

    async def get_result(self, submission_id: uuid.UUID, *, user: User) -> JudgeResult:
        # Ownership + tenant enforced at the repository query (F-5/F-6): a foreign submission
        # is indistinguishable from a missing one — 404, no existence oracle.
        row = await self.get_owned_row(submission_id, user=user)
        if row is None:
            raise ResourceNotFound("Submission not found")

        if row.status != "graded":
            raise ResourceNotFound("Submission not graded yet")

        cases = None
        if row.cases:
            cases = [JudgeResultCase(**c) for c in row.cases]

        return JudgeResult(
            submission_id=row.id,
            problem_id=row.problem_id,
            verdict=row.verdict or "accepted",
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

    async def get_owned_row(
        self, submission_id: uuid.UUID, *, user: User
    ) -> Submission | None:
        """Ownership+tenant-scoped read (F-5/F-6) — None for foreign/missing rows."""
        return await self._repo.get_owned(
            submission_id, user_id=user.id, org_id=user.org_id
        )

    async def get_result_for_ownership_check(
        self, submission_id: uuid.UUID, *, user: User
    ) -> None:
        """Existence+ownership check used by SSE ticket issuance — works for queued
        submissions too (a stream can be opened before grading finishes)."""
        if await self.get_owned_row(submission_id, user=user) is None:
            raise ResourceNotFound("Submission not found")
