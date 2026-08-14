import uuid

from fastapi import APIRouter, Query

from assessments.services.assessment import AssessmentService
from platform_core.contracts.assessments import Assessment
from platform_core.core.deps import DbSession

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("", response_model=list[Assessment])
async def list_assessments(
    session: DbSession, limit: int = Query(50, le=100), offset: int = Query(0, ge=0)
) -> list[Assessment]:
    return await AssessmentService(session).list_assessments(limit=limit, offset=offset)


@router.get("/{assessment_id}", response_model=Assessment)
async def get_assessment(assessment_id: uuid.UUID, session: DbSession) -> Assessment:
    return await AssessmentService(session).get_assessment(assessment_id)
