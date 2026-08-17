import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.models import ProgressContextSnapshot


class ContextRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_latest(self, user_id: uuid.UUID) -> ProgressContextSnapshot | None:
        result = await self._session.execute(
            select(ProgressContextSnapshot)
            .where(ProgressContextSnapshot.user_id == user_id)
            .order_by(ProgressContextSnapshot.context_version.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def save(self, snapshot: ProgressContextSnapshot) -> ProgressContextSnapshot:
        """Never updates an existing row — a new version is always a new INSERT (§5.4 step 7)."""
        self._session.add(snapshot)
        await self._session.flush()
        return snapshot
