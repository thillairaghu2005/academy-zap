import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from platform_core.core.models.audit_log import AuditLog


class AuditLogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

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
        entry = AuditLog(
            actor_user_id=actor_user_id,
            org_id=org_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            context=context or {},
        )
        self._session.add(entry)
        await self._session.flush()
        return entry

    async def list_recent(
        self, *, limit: int = 100, org_id: uuid.UUID | None = None
    ) -> list[AuditLog]:
        statement = select(AuditLog)
        if org_id is not None:
            statement = statement.where(AuditLog.org_id == org_id)
        result = await self._session.execute(
            statement.order_by(AuditLog.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())
