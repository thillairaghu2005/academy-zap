"""Judge submission repository — the persistence boundary for submissions.

Tenant/ownership scoping (slice 10 remediation F-5/F-6) is enforced HERE, in the query, not in
the service layer: every API-facing read carries the caller's `user_id`/`org_id`, so a
submission is only reachable by its owner within its tenant. The worker path (system process,
no caller context) uses the unscoped `get_by_id` / `claim_processing`.

`claim_processing` is the ATOMIC claim (F-10): a single `UPDATE ... WHERE status='queued'
RETURNING` — two concurrent workers cannot both claim the same submission.
"""

import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import ColumnElement, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from judge.models import Submission, TestCase


class SubmissionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, **kwargs: object) -> Submission:
        submission = Submission(**kwargs)
        self._session.add(submission)
        await self._session.flush()
        return submission

    async def get_by_id(self, submission_id: uuid.UUID) -> Submission | None:
        """Unscoped read — worker/system path only."""
        result = await self._session.execute(
            select(Submission).where(Submission.id == submission_id)
        )
        return result.scalars().first()

    async def get_owned(
        self,
        submission_id: uuid.UUID,
        *,
        user_id: uuid.UUID,
        org_id: uuid.UUID | None,
    ) -> Submission | None:
        """API-facing read: id + owner + tenant must all match, or the row does not exist.

        An owner with no org (org_id NULL) only reaches submissions that are also org-less;
        an org member only reaches submissions inside their own tenant.
        """
        result = await self._session.execute(
            select(Submission).where(
                Submission.id == submission_id,
                Submission.user_id == user_id,
                _org_scope(Submission.org_id, org_id),
            )
        )
        return result.scalars().first()

    async def claim_processing(self, submission_id: uuid.UUID) -> bool:
        """Atomically claim a queued submission. True only for the worker that won."""
        result = await self._session.execute(
            update(Submission)
            .where(Submission.id == submission_id, Submission.status == "queued")
            .values(status="processing", updated_at=func.now())
            .returning(Submission.id)
        )
        return result.scalar_one_or_none() is not None

    async def mark_error(self, submission_id: uuid.UUID | None, message: str) -> None:
        if submission_id is None:
            return
        await self._session.execute(
            update(Submission)
            .where(Submission.id == submission_id)
            .values(status="error", error=message[:500], updated_at=func.now())
        )

    async def get_test_cases(self, problem_id: uuid.UUID) -> Sequence[TestCase]:
        result = await self._session.execute(
            select(TestCase).where(TestCase.problem_id == problem_id).order_by(TestCase.position)
        )
        return result.scalars().all()


def _org_scope(column: Any, org_id: uuid.UUID | None) -> ColumnElement[bool]:
    """Tenant scoping predicate: NULL orgs match NULL, set orgs match exactly."""
    if org_id is None:
        return column.is_(None)  # type: ignore[no-any-return]
    return column == org_id  # type: ignore[no-any-return]
