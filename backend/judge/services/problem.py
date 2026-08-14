import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from judge.models import Problem as ProblemModel
from judge.repositories.problem import ProblemRepository
from platform_core.contracts.judge import Problem, SampleCase
from platform_core.core.exceptions import ResourceNotFound


class ProblemService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = ProblemRepository(session)

    async def list_problems(self, *, limit: int = 50, offset: int = 0) -> list[Problem]:
        rows = await self._repo.list_all(limit=limit, offset=offset)
        return [await self._to_contract(row, include_samples=False) for row in rows]

    async def get_problem(self, problem_id: uuid.UUID) -> Problem:
        row = await self._repo.get_by_id(problem_id)
        if row is None:
            raise ResourceNotFound("Problem not found.")
        return await self._to_contract(row, include_samples=True)

    async def _to_contract(self, row: ProblemModel, *, include_samples: bool) -> Problem:
        hidden_count = await self._repo.count_hidden_test_cases(row.id)
        return Problem(
            id=row.id,
            slug=row.slug,
            title=row.title,
            difficulty=row.difficulty,
            estimated_minutes=row.estimated_minutes,
            success_rate_pct=0.0,  # projection, not yet built (build.md B4/B9 read-models)
            topics=row.topics,
            statement=row.statement,
            constraints=row.constraints,
            starter_code=row.starter_code,
            sample_cases=[
                SampleCase(input=sc.input, output=sc.output, explanation=sc.explanation)
                for sc in (row.sample_cases if include_samples else [])
            ],
            hidden_test_count=hidden_count,
            time_limit_ms=row.time_limit_ms,
            memory_limit_kb=row.memory_limit_kb,
            expected_solution=None,  # never exposed over the API regardless of DB value
        )
