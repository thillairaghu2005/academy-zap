import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from labs.models import Lab


class LabRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self, *, limit: int = 50, offset: int = 0) -> list[Lab]:
        result = await self._session.execute(
            select(Lab)
            .order_by(Lab.title)
            .limit(limit)
            .offset(offset)
            .options(selectinload(Lab.objectives))
        )
        return list(result.scalars().all())

    async def get_by_id(self, lab_id: uuid.UUID) -> Lab | None:
        result = await self._session.execute(
            select(Lab).where(Lab.id == lab_id).options(selectinload(Lab.objectives))
        )
        return result.scalar_one_or_none()
