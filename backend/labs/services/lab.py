import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from labs.models import Lab as LabModel
from labs.repositories.lab import LabRepository
from platform_core.contracts.labs import Lab, LabObjective
from platform_core.core.exceptions import ResourceNotFound


class LabService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = LabRepository(session)

    async def list_labs(self, *, limit: int = 50, offset: int = 0) -> list[Lab]:
        rows = await self._repo.list_all(limit=limit, offset=offset)
        return [self._to_contract(row) for row in rows]

    async def get_lab(self, lab_id: uuid.UUID) -> Lab:
        row = await self._repo.get_by_id(lab_id)
        if row is None:
            raise ResourceNotFound("Lab not found.")
        return self._to_contract(row)

    def _to_contract(self, row: LabModel) -> Lab:
        return Lab(
            id=row.id,
            slug=row.slug,
            title=row.title,
            category=row.category,
            difficulty=row.difficulty,
            description=row.description,
            estimated_minutes=row.estimated_minutes,
            success_rate_pct=0.0,  # projection, not yet built
            requires_gui=row.requires_gui,
            hard_timeout_minutes=row.hard_timeout_minutes,
            objectives=[
                LabObjective(
                    id=o.id,
                    title=o.title,
                    description=o.description,
                    hints=o.hints,
                    requires_terminal=o.requires_terminal,
                )
                for o in row.objectives
            ],
        )
