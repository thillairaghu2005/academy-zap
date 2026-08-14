import uuid

from fastapi import APIRouter, Query

from labs.services.lab import LabService
from platform_core.contracts.labs import Lab
from platform_core.core.deps import DbSession

router = APIRouter(prefix="/labs", tags=["labs"])


@router.get("", response_model=list[Lab])
async def list_labs(
    session: DbSession, limit: int = Query(50, le=100), offset: int = Query(0, ge=0)
) -> list[Lab]:
    return await LabService(session).list_labs(limit=limit, offset=offset)


@router.get("/{lab_id}", response_model=Lab)
async def get_lab(lab_id: uuid.UUID, session: DbSession) -> Lab:
    return await LabService(session).get_lab(lab_id)
