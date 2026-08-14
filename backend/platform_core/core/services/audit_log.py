import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from platform_core.core.models.audit_log import AuditLog
from platform_core.core.repositories.audit_log import AuditLogRepository


class AuditLogService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = AuditLogRepository(session)

    async def record(
        self,
        *,
        actor_user_id: uuid.UUID,
        org_id: uuid.UUID | None,
        action: str,
        resource_type: str,
        resource_id: str,
        context: dict[str, Any] | None = None,
    ) -> AuditLog:
        entry = await self._repo.record(
            actor_user_id=actor_user_id,
            org_id=org_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            context=context,
        )
        await self._session.commit()
        return entry

    async def list_recent(
        self, *, limit: int = 100, org_id: uuid.UUID | None = None
    ) -> list[AuditLog]:
        return await self._repo.list_recent(limit=limit, org_id=org_id)
