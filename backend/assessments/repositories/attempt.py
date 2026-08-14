import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from assessments.models import AssessmentSubmission


class AttemptRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def count_for_user(self, assessment_id: uuid.UUID, user_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count(AssessmentSubmission.attempt_id)).where(
                AssessmentSubmission.assessment_id == assessment_id,
                AssessmentSubmission.user_id == user_id,
            )
        )
        return int(result.scalar_one())

    async def create(self, attempt: AssessmentSubmission) -> AssessmentSubmission:
        self._session.add(attempt)
        await self._session.flush()
        return attempt

    async def get(
        self, attempt_id: uuid.UUID, *, for_update: bool = False
    ) -> AssessmentSubmission | None:
        statement = select(AssessmentSubmission).where(
            AssessmentSubmission.attempt_id == attempt_id
        )
        if for_update:
            statement = statement.with_for_update()
        return (await self._session.execute(statement)).scalar_one_or_none()

    async def list_for_user(
        self, assessment_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[AssessmentSubmission]:
        result = await self._session.execute(
            select(AssessmentSubmission)
            .where(
                AssessmentSubmission.assessment_id == assessment_id,
                AssessmentSubmission.user_id == user_id,
            )
            .order_by(AssessmentSubmission.attempt_number.desc())
        )
        return list(result.scalars().all())
