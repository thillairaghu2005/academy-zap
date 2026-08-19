"""Notebook version repository (B6).

Published versions are immutable snapshots: this repository only ever READS version content.
There is intentionally no update/mutate method — a content change is a NEW version row, so a
published notebook served to learners can never change underneath a live session.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from labs.models import LabSection, LabVersion


class LabVersionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_published_with_content(self, lab_id: uuid.UUID) -> LabVersion | None:
        """Highest `published` version for a lab, with its full section/cell tree eager-loaded.

        Used by both the catalog detail route (renders the notebook manifest) and the progress
        service (pins a learner session to a version).
        """
        result = await self._session.execute(
            select(LabVersion)
            .where(
                LabVersion.lab_id == lab_id,
                LabVersion.status == "published",
            )
            .order_by(LabVersion.version.desc())
            .options(selectinload(LabVersion.sections).selectinload(LabSection.cells))
        )
        return result.scalars().first()

    async def get_by_id(self, version_id: uuid.UUID) -> LabVersion | None:
        result = await self._session.execute(
            select(LabVersion)
            .where(LabVersion.id == version_id)
            .options(selectinload(LabVersion.sections).selectinload(LabSection.cells))
        )
        return result.scalar_one_or_none()