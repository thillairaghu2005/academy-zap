import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from assessments.models import Assessment


class AssessmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_published(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        org_id: uuid.UUID | None = None,
    ) -> list[Assessment]:
        """Published assessments visible within `org_id` (slice 03 §2)."""
        scope: ColumnElement[bool] = Assessment.org_id.is_(None)
        if org_id is not None:
            scope = scope | (Assessment.org_id == org_id)
        result = await self._session.execute(
            select(Assessment)
            .where(Assessment.status == "published", scope)
            .order_by(Assessment.title)
            .limit(limit)
            .offset(offset)
            .options(selectinload(Assessment.questions))
        )
        return list(result.scalars().all())

    async def get_by_id(self, assessment_id: uuid.UUID) -> Assessment | None:
        result = await self._session.execute(
            select(Assessment)
            .where(Assessment.id == assessment_id)
            .options(selectinload(Assessment.questions))
        )
        return result.scalar_one_or_none()
