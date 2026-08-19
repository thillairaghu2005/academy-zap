"""User checkpoint repository (B6) — explicit session snapshots for undo/replay."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from labs.models import UserCheckpoint


class CheckpointRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        progress_id: uuid.UUID,
        label: str,
        snapshot: dict[str, object],
    ) -> UserCheckpoint:
        checkpoint = UserCheckpoint(
            progress_id=progress_id,
            label=label[:200],
            snapshot=snapshot,
        )
        self._session.add(checkpoint)
        await self._session.flush()
        return checkpoint