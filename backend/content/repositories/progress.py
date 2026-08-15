import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from content.models import Course, Lesson, LessonProgress, Module


class ProgressRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_lesson_course(self, lesson_id: uuid.UUID) -> tuple[Lesson, Course] | None:
        result = await self._session.execute(
            select(Lesson, Course)
            .join(Module, Module.id == Lesson.module_id)
            .join(Course, Course.id == Module.course_id)
            .where(Lesson.id == lesson_id)
        )
        row = result.one_or_none()
        return (row[0], row[1]) if row is not None else None

    async def get_lesson_progress(
        self, lesson_id: uuid.UUID, user_id: uuid.UUID
    ) -> LessonProgress | None:
        return (
            await self._session.execute(
                select(LessonProgress).where(
                    LessonProgress.lesson_id == lesson_id,
                    LessonProgress.user_id == user_id,
                )
            )
        ).scalar_one_or_none()

    async def count_lessons(self, course_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count(Lesson.id))
            .join(Module, Module.id == Lesson.module_id)
            .where(Module.course_id == course_id)
        )
        return int(result.scalar_one())

    async def completed_lesson_ids(
        self, course_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[uuid.UUID]:
        result = await self._session.execute(
            select(LessonProgress.lesson_id)
            .join(Lesson, Lesson.id == LessonProgress.lesson_id)
            .join(Module, Module.id == Lesson.module_id)
            .where(
                Module.course_id == course_id,
                LessonProgress.user_id == user_id,
                LessonProgress.completed_at.is_not(None),
            )
            .order_by(Lesson.position, Lesson.id)
        )
        return list(result.scalars().all())

    async def total_position_seconds(self, course_id: uuid.UUID, user_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.coalesce(func.sum(LessonProgress.last_position_seconds), 0))
            .join(Lesson, Lesson.id == LessonProgress.lesson_id)
            .join(Module, Module.id == Lesson.module_id)
            .where(Module.course_id == course_id, LessonProgress.user_id == user_id)
        )
        return int(result.scalar_one())

    async def total_lesson_duration(self, course_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.coalesce(func.sum(Lesson.duration_seconds), 0))
            .join(Module, Module.id == Lesson.module_id)
            .where(Module.course_id == course_id)
        )
        return int(result.scalar_one())
