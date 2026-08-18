import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from judge.models import Submission, TestCase


class SubmissionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, **kwargs) -> Submission:
        submission = Submission(**kwargs)
        self._session.add(submission)
        await self._session.flush()
        return submission

    async def get_by_id(self, submission_id: uuid.UUID) -> Submission | None:
        result = await self._session.execute(
            select(Submission).where(Submission.id == submission_id)
        )
        return result.scalars().first()

    async def get_test_cases(self, problem_id: uuid.UUID) -> Sequence[TestCase]:
        result = await self._session.execute(
            select(TestCase).where(TestCase.problem_id == problem_id).order_by(TestCase.position)
        )
        return result.scalars().all()
