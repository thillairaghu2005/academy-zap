import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from content.models import Enrollment


class EnrollmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(
        self, course_id: uuid.UUID, user_id: uuid.UUID, *, for_update: bool = False
    ) -> Enrollment | None:
        statement = select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.user_id == user_id,
        )
        if for_update:
            statement = statement.with_for_update()
        return (await self._session.execute(statement)).scalar_one_or_none()

    async def create(self, enrollment: Enrollment) -> Enrollment:
        self._session.add(enrollment)
        await self._session.flush()
        return enrollment

    async def list_for_user(self, user_id: uuid.UUID) -> list[Enrollment]:
        result = await self._session.execute(
            select(Enrollment)
            .where(Enrollment.user_id == user_id)
            .order_by(Enrollment.updated_at.desc())
        )
        return list(result.scalars().all())
