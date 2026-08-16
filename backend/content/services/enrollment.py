import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from content.models import Enrollment, LessonProgress
from content.repositories.course import CourseRepository
from content.repositories.enrollment import EnrollmentRepository
from content.repositories.progress import ProgressRepository
from content.schemas.progress import CourseProgress, LessonProgressInput, MyLearningItem
from platform_core.bus.producer import publish
from platform_core.contracts.content import CourseSummary
from platform_core.contracts.content import Enrollment as EnrollmentContract
from platform_core.core.exceptions import ConflictError, ResourceNotFound, UnprocessableEntity
from platform_core.core.redis import AsyncRedis
from platform_core.core.services.identity import IdentityService
from platform_core.events.schema import CourseCompletedEvent


def _enrollment_contract(row: Enrollment) -> EnrollmentContract:
    return EnrollmentContract(
        course_id=row.course_id,
        user_id=row.user_id,
        status=row.status,
        progress_pct=float(row.progress_pct),
        last_lesson_id=row.last_lesson_id,
        last_position_seconds=row.last_position_seconds,
        enrolled_at=row.enrolled_at,
        updated_at=row.updated_at,
    )


class EnrollmentService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._courses = CourseRepository(session)
        self._enrollments = EnrollmentRepository(session)

    async def list_my_learning(
        self, user_id: uuid.UUID, org_id: uuid.UUID | None
    ) -> list[MyLearningItem]:
        identity = IdentityService(self._session)
        items: list[MyLearningItem] = []
        for enrollment in await self._enrollments.list_for_user(user_id):
            course = await self._courses.get_published_by_id(enrollment.course_id, org_id=org_id)
            if course is None:
                continue
            instructor = await identity.get_public_identity(course.instructor_user_id)
            items.append(
                MyLearningItem(
                    enrollment=_enrollment_contract(enrollment),
                    course=CourseSummary(
                        id=course.id,
                        title=course.title,
                        subtitle=course.subtitle,
                        category=course.category,
                        level=course.level,
                        rating=0,
                        review_count=0,
                        price_cents=course.price_cents,
                        enrolled_count=0,
                        estimated_hours=float(course.estimated_hours),
                        total_lessons=sum(len(module.lessons) for module in course.modules),
                        instructor_name=instructor.display_name if instructor else "",
                        language=course.language,
                        format=course.format or "video",
                        career_track=course.career_track or "web_development",
                        is_project_based=course.is_project_based,
                        certificate_included=course.certificate_included,
                    ),
                )
            )
        return items

    async def enroll(
        self, course_id: uuid.UUID, user_id: uuid.UUID, org_id: uuid.UUID | None
    ) -> EnrollmentContract:
        await self._session.execute(
            select(
                func.pg_advisory_xact_lock(
                    func.hashtextextended(f"enroll:{course_id}:{user_id}", 0)
                )
            )
        )
        course = await self._courses.get_published_by_id(course_id, org_id=org_id)
        if course is None:
            raise ResourceNotFound("Course not found.")
        if course.price_cents > 0:
            raise ConflictError("Purchase entitlement is required before enrollment.")
        existing = await self._enrollments.get(course_id, user_id)
        if existing is not None:
            return _enrollment_contract(existing)
        first_lesson = next(
            (
                lesson
                for module in sorted(course.modules, key=lambda item: item.position)
                for lesson in sorted(module.lessons, key=lambda item: item.position)
            ),
            None,
        )
        row = await self._enrollments.create(
            Enrollment(
                course_id=course_id,
                user_id=user_id,
                last_lesson_id=first_lesson.id if first_lesson else None,
            )
        )
        await self._session.commit()
        return _enrollment_contract(row)


class ProgressService:
    def __init__(self, session: AsyncSession, redis: AsyncRedis | None = None) -> None:
        self._session = session
        self._redis = redis
        self._courses = CourseRepository(session)
        self._enrollments = EnrollmentRepository(session)
        self._progress = ProgressRepository(session)

    async def get_progress(
        self, course_id: uuid.UUID, user_id: uuid.UUID, org_id: uuid.UUID | None
    ) -> CourseProgress:
        course = await self._courses.get_published_by_id(course_id, org_id=org_id)
        if course is None:
            raise ResourceNotFound("Course not found.")
        enrollment = await self._enrollments.get(course_id, user_id)
        if enrollment is None:
            return CourseProgress(enrollment=None, completed_lesson_ids=[])
        return CourseProgress(
            enrollment=_enrollment_contract(enrollment),
            completed_lesson_ids=await self._progress.completed_lesson_ids(course_id, user_id),
        )

    async def record_lesson_progress(
        self,
        lesson_id: uuid.UUID,
        user_id: uuid.UUID,
        org_id: uuid.UUID | None,
        data: LessonProgressInput,
    ) -> CourseProgress:
        lesson_course = await self._progress.get_lesson_course(lesson_id)
        if lesson_course is None:
            raise ResourceNotFound("Lesson not found.")
        lesson, course = lesson_course
        if course.status != "published" or (course.org_id is not None and course.org_id != org_id):
            raise ResourceNotFound("Lesson not found.")
        enrollment = await self._enrollments.get(course.id, user_id, for_update=True)
        if enrollment is None:
            raise ResourceNotFound("Enrollment not found.")
        duration = max(1, lesson.duration_seconds)
        # Slice 02 §5/§6: the server rejects progress beyond the lesson's duration instead of
        # clamping, so a client can never jump past the end to force a completion.
        if data.position_seconds > duration:
            raise UnprocessableEntity("Progress cannot exceed the lesson duration.")
        progress = await self._progress.get_lesson_progress(lesson_id, user_id)
        # Idempotent no-op: a report that does not advance the stored position can change no
        # completion state, so skip the write entirely (slice 02 §6 — no polling-write churn).
        if progress is not None and data.position_seconds <= progress.last_position_seconds:
            return await self.get_progress(course.id, user_id, org_id)
        now = datetime.now(UTC)
        completed = data.position_seconds >= duration
        progress_pct = min(100, round(data.position_seconds / duration * 100, 2))
        if progress is None:
            progress = LessonProgress(
                lesson_id=lesson_id,
                user_id=user_id,
                progress_pct=progress_pct,
                last_position_seconds=data.position_seconds,
                completed_at=now if completed else None,
            )
            self._session.add(progress)
        else:
            progress.last_position_seconds = max(
                progress.last_position_seconds, data.position_seconds
            )
            progress.progress_pct = max(float(progress.progress_pct), progress_pct)
            if completed and progress.completed_at is None:
                progress.completed_at = now
        await self._session.flush()
        completed_ids = await self._progress.completed_lesson_ids(course.id, user_id)
        total_lessons = await self._progress.count_lessons(course.id)
        enrollment.progress_pct = (
            round(len(completed_ids) / total_lessons * 100, 2) if total_lessons else 0
        )
        was_completed = enrollment.status == "completed"
        enrollment.status = (
            "completed" if total_lessons and len(completed_ids) == total_lessons else "active"
        )
        enrollment.last_lesson_id = lesson_id
        enrollment.last_position_seconds = progress.last_position_seconds
        await self._session.flush()
        await self._session.commit()

        if enrollment.status == "completed" and not was_completed:
            event = CourseCompletedEvent(
                user_id=user_id,
                org_id=org_id,
                idempotency_key=f"course.completed:{course.id}:{user_id}",
                session_fingerprint=f"auth:{user_id}",
                course_id=course.id,
                category=course.category,
                time_spent_seconds=await self._progress.total_position_seconds(course.id, user_id),
                completion_pct=100.0,
                payload={
                    "content_duration_seconds": await self._progress.total_lesson_duration(
                        course.id
                    )
                },
            )
            if self._redis is None:
                raise RuntimeError("Redis is required to publish course completion events")
            await publish(event, self._redis)

        return await self.get_progress(course.id, user_id, org_id)
