import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from assessments.models import Assessment as AssessmentModel
from assessments.repositories.assessment import AssessmentRepository
from platform_core.contracts.assessments import Assessment, AssessmentQuestion
from platform_core.core.exceptions import ResourceNotFound


class AssessmentService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = AssessmentRepository(session)

    async def list_assessments(self, *, limit: int = 50, offset: int = 0) -> list[Assessment]:
        rows = await self._repo.list_all(limit=limit, offset=offset)
        return [self._to_contract(row) for row in rows]

    async def get_assessment(self, assessment_id: uuid.UUID) -> Assessment:
        row = await self._repo.get_by_id(assessment_id)
        if row is None:
            raise ResourceNotFound("Assessment not found.")
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
