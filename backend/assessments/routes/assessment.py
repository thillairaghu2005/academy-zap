import uuid

from fastapi import APIRouter, Query

from assessments.services.assessment import AssessmentService
from platform_core.contracts.assessments import Assessment
from platform_core.core.deps import CurrentUser, DbSession

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("", response_model=list[Assessment])
async def list_assessments(
    session: DbSession,
    current_user: CurrentUser,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
) -> list[Assessment]:
    return await AssessmentService(session).list_assessments(
        user_id=current_user.id, org_id=current_user.org_id, limit=limit, offset=offset
    )


@router.get("/{assessment_id}", response_model=Assessment)
async def get_assessment(
    assessment_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> Assessment:
    return await AssessmentService(session).get_assessment(
        assessment_id, current_user.id, current_user.org_id
    )
