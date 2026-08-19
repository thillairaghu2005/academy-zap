from fastapi import APIRouter, Query

from labs.services.lab import LabService
from platform_core.contracts.labs import Lab, LabDetail
from platform_core.core.deps import DbSession

router = APIRouter(prefix="/labs", tags=["labs"])


@router.get("", response_model=list[Lab])
async def list_labs(
    session: DbSession, limit: int = Query(50, le=100), offset: int = Query(0, ge=0)
) -> list[Lab]:
    return await LabService(session).list_labs(limit=limit, offset=offset)


@router.get("/{identifier}", response_model=LabDetail)
async def get_lab(identifier: str, session: DbSession) -> LabDetail:
    """Resolve slug-first with UUID fallback, so the B6 slug contract and the foundation
    UUID contract (`test_labs_catalog.py`) both work on one route."""
    return await LabService(session).get_lab(identifier)