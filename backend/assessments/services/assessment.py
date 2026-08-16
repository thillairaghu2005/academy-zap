import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from assessments.models import Assessment as AssessmentModel
from assessments.repositories.assessment import AssessmentRepository
from assessments.services.access import get_accessible_assessment
from content.read_api import get_published_course, is_enrolled
from platform_core.contracts.assessments import Assessment, AssessmentQuestion


class AssessmentService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = AssessmentRepository(session)

    async def list_assessments(
        self,
        *,
        user_id: uuid.UUID,
        org_id: uuid.UUID | None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Assessment]:
        rows = await self._repo.list_published(limit=limit, offset=offset, org_id=org_id)
        accessible: list[Assessment] = []
        for row in rows:
            # The catalog shows only assessments whose course the caller can actually reach:
            # published + tenant-visible + enrolled (slice 03 §2).
            if row.course_id is None:
                continue
            course = await get_published_course(self._session, row.course_id, org_id)
            if course is None:
                continue
            if not await is_enrolled(self._session, row.course_id, user_id):
                continue
            accessible.append(self._to_contract(row))
        return accessible

    async def get_assessment(
        self, assessment_id: uuid.UUID, user_id: uuid.UUID, org_id: uuid.UUID | None
    ) -> Assessment:
        row = await get_accessible_assessment(self._session, assessment_id, user_id, org_id)
        return self._to_contract(row)

    def _to_contract(self, row: AssessmentModel) -> Assessment:
        return Assessment(
            id=row.id,
            slug=row.slug,
            title=row.title,
            category=row.category,
            description=row.description,
            version=row.version,
            estimated_minutes=row.estimated_minutes,
            attempts_allowed=row.attempts_allowed,
            passing_percent=float(row.passing_percent),
            questions=[
                AssessmentQuestion(
                    id=q.id,
                    type=q.type,
                    difficulty=q.difficulty,
                    prompt=q.prompt,
                    options=q.options,
                    accepted_answers=None,  # never exposed over the API regardless of DB value
                    starter_code=q.starter_code,
                    reference_solution=None,  # never exposed over the API regardless of DB value
                )
                for q in row.questions
            ],
        )
