
from sqlalchemy.ext.asyncio import AsyncSession

from labs.models import Lab as LabModel
from labs.models import LabVersion
from labs.repositories.lab import LabRepository
from labs.repositories.version import LabVersionRepository
from platform_core.contracts.labs import (
    Lab,
    LabCellView,
    LabDetail,
    LabObjective,
    LabSectionView,
    LabVersionView,
)
from platform_core.core.exceptions import ResourceNotFound


class LabService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = LabRepository(session)
        self._versions = LabVersionRepository(session)

    async def list_labs(self, *, limit: int = 50, offset: int = 0) -> list[Lab]:
        rows = await self._repo.list_all(limit=limit, offset=offset)
        return [self._to_contract(row) for row in rows]

    async def get_lab(self, identifier: str) -> LabDetail:
        """Resolve a lab slug-first, with UUID fallback (B6 + foundation compatibility).

        The response includes the lab's published notebook manifest when one exists
        (`notebook` is None for labs that are terminal-only, e.g. the seed CTF labs)."""
        row = await self._repo.get_by_slug_or_id(identifier)
        if row is None:
            raise ResourceNotFound("Lab not found.")
        version = await self._versions.get_published_with_content(row.id)
        return self._to_detail(row, version)

    def _to_detail(self, row: LabModel, version: LabVersion | None) -> LabDetail:
        notebook = None
        if version is not None:
            notebook = self._to_version_view(version)
        return LabDetail(
            **self._to_contract(row).model_dump(),
            notebook=notebook,
        )

    def _to_version_view(self, version: LabVersion) -> LabVersionView:
        return LabVersionView(
            version=version.version,
            sections=[
                LabSectionView(
                    id=section.id,
                    title=section.title,
                    position=section.position,
                    cells=[
                        LabCellView(
                            id=cell.id,
                            cell_type=cell.cell_type,
                            content=cell.content,
                            position=cell.position,
                        )
                        for cell in section.cells
                    ],
                )
                for section in version.sections
            ],
        )

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