import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from judge.models import Problem, TestCase


class ProblemRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self, *, limit: int = 50, offset: int = 0) -> list[Problem]:
        result = await self._session.execute(
            select(Problem).order_by(Problem.title).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_id(self, problem_id: uuid.UUID) -> Problem | None:
        result = await self._session.execute(
            select(Problem)
            .where(Problem.id == problem_id)
            .options(selectinload(Problem.sample_cases))
        )
        return result.scalar_one_or_none()

    async def count_hidden_test_cases(self, problem_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(TestCase).where(TestCase.problem_id == problem_id)
        )
        return result.scalar_one()
