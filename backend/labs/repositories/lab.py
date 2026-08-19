import uuid

from sqlalchemy import ColumnElement, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from labs.models import Lab


def _visible_scope(org_id: uuid.UUID | None) -> ColumnElement[bool]:
    """A lab is usable by a tenant when it is public (org_id NULL) or belongs to that tenant
    (mirrors judge's problem visibility)."""
    if org_id is None:
        return Lab.org_id.is_(None)
    return or_(Lab.org_id.is_(None), Lab.org_id == org_id)


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

    async def get_by_slug_or_id(self, identifier: str) -> Lab | None:
        """Resolve a catalog path segment slug-first, with UUID fallback.

        The B6 contract routes by slug (`/labs/{slug}`); the foundation contract routed by
        UUID (`/labs/{lab_id}`) and its tests must stay green. One route serves both: try the
        slug (exact match), then — only if the segment parses as a UUID — the id.
        """
        result = await self._session.execute(
            select(Lab).where(Lab.slug == identifier).options(selectinload(Lab.objectives))
        )
        lab = result.scalar_one_or_none()
        if lab is not None:
            return lab
        try:
            lab_id = uuid.UUID(identifier)
        except (ValueError, TypeError):
            return None
        return await self.get_by_id(lab_id)

    async def get_visible_by_slug_or_id(
        self, identifier: str, *, org_id: uuid.UUID | None
    ) -> Lab | None:
        """Authenticated-path resolution: slug-first with UUID fallback, scoped so a lab owned
        by another tenant is indistinguishable from a missing one (404)."""
        result = await self._session.execute(
            select(Lab)
            .where(Lab.slug == identifier, _visible_scope(org_id))
            .options(selectinload(Lab.objectives))
        )
        lab = result.scalar_one_or_none()
        if lab is not None:
            return lab
        try:
            lab_id = uuid.UUID(identifier)
        except (ValueError, TypeError):
            return None
        result = await self._session.execute(
            select(Lab).where(Lab.id == lab_id, _visible_scope(org_id))
        )
        return result.scalar_one_or_none()