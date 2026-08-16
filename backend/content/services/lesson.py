"""Lesson access service (vertical slice 02).

Gate: a learner may read a lesson's content only when the lesson belongs to a published
course the learner is enrolled in, within their tenant scope. Everything is derived from
the authenticated user — `user_id` and `org_id` never come from the client (slice 02 §2).
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from content.repositories.enrollment import EnrollmentRepository
from content.repositories.progress import ProgressRepository
from content.schemas.lesson import LessonContent
from platform_core.core.exceptions import PermissionDenied, ResourceNotFound


class LessonService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._lessons = ProgressRepository(session)
        self._enrollments = EnrollmentRepository(session)

    async def get_lesson_content(
        self, lesson_id: uuid.UUID, user_id: uuid.UUID, org_id: uuid.UUID | None
    ) -> LessonContent:
        lesson_course = await self._lessons.get_lesson_course(lesson_id)
        if lesson_course is None:
            raise ResourceNotFound("Lesson not found.")
        lesson, course = lesson_course
        if course.status != "published" or (course.org_id is not None and course.org_id != org_id):
            # Same 404 shape as the catalog: existence of a foreign/restricted lesson is not
            # disclosed to a caller outside its tenant or publication state.
            raise ResourceNotFound("Lesson not found.")
        enrollment = await self._enrollments.get(course.id, user_id)
        if enrollment is None:
            raise PermissionDenied("Enroll in this course to access its lessons.")
        return LessonContent(
            id=lesson.id,
            title=lesson.title,
            kind=lesson.kind,
            duration_seconds=lesson.duration_seconds,
            position=lesson.position,
            is_preview=lesson.is_preview,
            body=lesson.preview_body if lesson.kind == "article" else None,
        )
