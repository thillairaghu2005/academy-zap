"""Content Engine service — the two routes bucketed "real (trivial)": listing and reading a
course off tables that exist but are currently empty. No video pipeline, no signed manifests,
no enrollment writes here — see `content/routes/course.py` for what's still a 501 stub.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from content.repositories.course import CourseRepository
from content.schemas.course import Course, CourseListResponse, CourseSummary
from platform_core.contracts.content import CourseInstructor, CourseLesson, CourseSection
from platform_core.contracts.identity import IdentityProvider
from platform_core.core.exceptions import ResourceNotFound
from platform_core.core.services.identity import IdentityService


class CourseService:
    def __init__(self, session: AsyncSession, identity: IdentityProvider | None = None) -> None:
        self._session = session
        self._courses = CourseRepository(session)
        self._identity = identity or IdentityService(session)

    async def list_courses(self, *, limit: int = 50, offset: int = 0) -> CourseListResponse:
        rows, total = await self._courses.list_published(limit=limit, offset=offset)
        items = []
        for row in rows:
            instructor = await self._identity.get_public_identity(row.instructor_user_id)
            items.append(
                CourseSummary(
                    id=row.id,
                    title=row.title,
                    subtitle=row.subtitle,
                    category=row.category,
                    level=row.level,
                    rating=0.0,  # aggregate rating is a future read-model (build.md §11), not AVG()
                    review_count=0,
                    price_cents=row.price_cents,
                    enrolled_count=0,
                    estimated_hours=float(row.estimated_hours),
                    total_lessons=sum(len(m.lessons) for m in row.modules) if row.modules else 0,
                    instructor_name=instructor.display_name if instructor else "",
                    language=row.language,
                    format=row.format or "video",
                    career_track=row.career_track or "web_development",
                    is_project_based=row.is_project_based,
                    certificate_included=row.certificate_included,
                )
            )
        return CourseListResponse(items=items, total=total)

    async def get_course(self, course_id: uuid.UUID) -> Course:
        row = await self._courses.get_published_by_id(course_id)
        if row is None:
            raise ResourceNotFound("Course not found.")

        instructor = await self._identity.get_public_identity(row.instructor_user_id)
        syllabus = [
            CourseSection(
                id=module.id,
                title=module.title,
                position=module.position,
                lessons=[
                    CourseLesson(
                        id=lesson.id,
                        title=lesson.title,
                        kind=lesson.kind,
                        duration_seconds=lesson.duration_seconds,
                        position=lesson.position,
                        is_preview=lesson.is_preview,
                        preview_body=lesson.preview_body,
                    )
                    for lesson in sorted(module.lessons, key=lambda item: item.position)
                ],
            )
            for module in sorted(row.modules, key=lambda item: item.position)
        ]

        return Course(
            id=row.id,
            title=row.title,
            subtitle=row.subtitle,
            description=row.description,
            category=row.category,
            level=row.level,
            language=row.language,
            status=row.status,
            submitted_by=row.submitted_by,
            reviewed_by=row.reviewed_by,
            instructor=CourseInstructor(
                id=row.instructor_user_id,
                display_name=instructor.display_name if instructor else "",
                title="",
            ),
            rating=0.0,
            review_count=0,
            price_cents=row.price_cents,
            enrolled_count=0,
            estimated_hours=float(row.estimated_hours),
            syllabus=syllabus,
            created_at=row.created_at,
            updated_at=row.updated_at,
            format=row.format,
            career_track=row.career_track,
            is_project_based=row.is_project_based,
            certificate_included=row.certificate_included,
        )
