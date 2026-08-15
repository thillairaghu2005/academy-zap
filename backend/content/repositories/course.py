import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from content.models import Course, Module


class CourseRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_published(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        org_id: uuid.UUID | None = None,
    ) -> tuple[list[Course], int]:
        scope: ColumnElement[bool] = Course.org_id.is_(None)
        if org_id is not None:
            scope = scope | (Course.org_id == org_id)
        base = select(Course).where(Course.status == "published", scope)
        total = (
            await self._session.execute(select(func.count()).select_from(base.subquery()))
        ).scalar_one()
        result = await self._session.execute(
            base.order_by(Course.created_at.desc())
            .limit(limit)
            .offset(offset)
            .options(selectinload(Course.modules).selectinload(Module.lessons))
        )
        return list(result.scalars().all()), total

    async def get_by_id(self, course_id: uuid.UUID) -> Course | None:
        return await self._get_by_id(course_id, published_only=False)

    async def get_published_by_id(
        self, course_id: uuid.UUID, *, org_id: uuid.UUID | None = None
    ) -> Course | None:
        return await self._get_by_id(course_id, published_only=True, org_id=org_id)

    async def _get_by_id(
        self,
        course_id: uuid.UUID,
        *,
        published_only: bool,
        org_id: uuid.UUID | None = None,
    ) -> Course | None:
        conditions = [Course.id == course_id]
        if published_only:
            conditions.append(Course.status == "published")
        if org_id is None:
            conditions.append(Course.org_id.is_(None))
        else:
            conditions.append((Course.org_id.is_(None)) | (Course.org_id == org_id))
        result = await self._session.execute(
            select(Course)
            .where(*conditions)
            .options(selectinload(Course.modules).selectinload(Module.lessons))
        )
        return result.scalar_one_or_none()
