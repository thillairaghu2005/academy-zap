from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel

from platform_core.core.deps import AdminUser, DbSession
from platform_core.core.exceptions import PermissionDenied
from platform_core.core.rbac import Role
from platform_core.core.services.audit_log import AuditLogService

router = APIRouter(prefix="/admin", tags=["admin"])


class AuditLogEntry(BaseModel):
    id: UUID
    actor_user_id: UUID
    action: str
    resource_type: str
    resource_id: str
    org_id: UUID | None
    context: dict[str, object]
    created_at: datetime


@router.get("/audit", response_model=list[AuditLogEntry])
async def list_audit_log(
    session: DbSession, admin_user: AdminUser, limit: int = Query(100, le=500)
) -> list[AuditLogEntry]:
    if admin_user.role == Role.ORG_ADMIN and admin_user.org_id is None:
        raise PermissionDenied("Organization administrators must have an organization scope.")
    org_id = None if admin_user.role == Role.PLATFORM_OPS else admin_user.org_id
    rows = await AuditLogService(session).list_recent(limit=limit, org_id=org_id)
    return [AuditLogEntry.model_validate(row, from_attributes=True) for row in rows]
