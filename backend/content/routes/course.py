import uuid

from fastapi import APIRouter, Query

from content.schemas.course import Course, CourseListResponse
from content.schemas.lesson import LessonContent
from content.schemas.progress import CourseProgress, LessonProgressInput, MyLearningItem
from content.services.course import CourseService
from content.services.enrollment import EnrollmentService, ProgressService
from content.services.lesson import LessonService
from platform_core.contracts.content import Enrollment, SignedManifest
from platform_core.core.deps import CurrentUser, DbSession, OptionalCurrentUser, RedisClient
from platform_core.core.exceptions import NotImplementedFoundationError

router = APIRouter(tags=["content"])


@router.get("/me/enrollments", response_model=list[MyLearningItem])
async def list_my_learning(session: DbSession, current_user: CurrentUser) -> list[MyLearningItem]:
    return await EnrollmentService(session).list_my_learning(current_user.id, current_user.org_id)


@router.get("/courses", response_model=CourseListResponse)
async def list_courses(
    session: DbSession,
    current_user: OptionalCurrentUser,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
) -> CourseListResponse:
    return await CourseService(session).list_courses(
        limit=limit, offset=offset, org_id=current_user.org_id if current_user else None
    )


@router.get("/courses/{course_id}", response_model=Course)
async def get_course(
    course_id: uuid.UUID, session: DbSession, current_user: OptionalCurrentUser
) -> Course:
    return await CourseService(session).get_course(
        course_id, current_user.org_id if current_user else None
    )


@router.post("/courses/{course_id}/enroll", response_model=Enrollment, status_code=201)
async def enroll(course_id: uuid.UUID, session: DbSession, current_user: CurrentUser) -> Enrollment:
    return await EnrollmentService(session).enroll(course_id, current_user.id, current_user.org_id)


@router.get("/courses/{course_id}/progress", response_model=CourseProgress)
async def get_progress(
    course_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> CourseProgress:
    return await ProgressService(session).get_progress(
        course_id, current_user.id, current_user.org_id
    )


@router.post("/lessons/{lesson_id}/progress", response_model=CourseProgress)
async def record_progress(
    lesson_id: uuid.UUID,
    data: LessonProgressInput,
    session: DbSession,
    redis: RedisClient,
    current_user: CurrentUser,
) -> CourseProgress:
    return await ProgressService(session, redis).record_lesson_progress(
        lesson_id, current_user.id, current_user.org_id, data
    )


@router.get("/lessons/{lesson_id}", response_model=LessonContent)
async def get_lesson(
    lesson_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> LessonContent:
    """Enrollment-gated lesson content (slice 02 §2) — never trusts a client-supplied identity."""
    return await LessonService(session).get_lesson_content(
        lesson_id, current_user.id, current_user.org_id
    )


@router.get("/lessons/{lesson_id}/manifest", response_model=SignedManifest)
async def get_manifest(lesson_id: uuid.UUID, _current_user: CurrentUser) -> SignedManifest:
    raise NotImplementedFoundationError(
        "content", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §2.3"
    )
