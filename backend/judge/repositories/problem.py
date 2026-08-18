import uuid

from sqlalchemy import ColumnElement, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from judge.models import Problem, TestCase


def _visible_scope(org_id: uuid.UUID | None) -> ColumnElement[bool]:
    """A problem is usable by a tenant when it is public (org_id NULL) or belongs to that
    tenant. Callers without an org see public problems only (slice 10 remediation F-6)."""
    if org_id is None:
        return Problem.org_id.is_(None)
    return or_(Problem.org_id.is_(None), Problem.org_id == org_id)


class ProblemRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self, *, limit: int = 50, offset: int = 0) -> list[Problem]:
        result = await self._session.execute(
            select(Problem).order_by(Problem.title).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_id(self, problem_id: uuid.UUID) -> Problem | None:
        """Unscoped read — worker path and public problem detail."""
        result = await self._session.execute(
            select(Problem)
            .where(Problem.id == problem_id)
            .options(selectinload(Problem.sample_cases))
        )
        return result.scalar_one_or_none()

    async def get_visible(
        self, problem_id: uuid.UUID, *, org_id: uuid.UUID | None
    ) -> Problem | None:
        """Tenant-scoped read — a problem must be public or belong to the caller's org."""
        result = await self._session.execute(
            select(Problem)
            .where(and_(Problem.id == problem_id, _visible_scope(org_id)))
            .options(selectinload(Problem.sample_cases))
        )
        return result.scalar_one_or_none()

    async def count_hidden_test_cases(self, problem_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(TestCase).where(TestCase.problem_id == problem_id)
        )
        return result.scalar_one()
