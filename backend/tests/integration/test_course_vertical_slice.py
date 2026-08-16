"""Course enrollment, server-derived progress, event emission, and gamification integration."""

import uuid

import fakeredis
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from content.models import Course, Lesson, Module
from gamification.context.resolver import ProgressContextResolver
from gamification.services.event_processor import GamificationEventProcessor
from platform_core.bus.consumer import EventConsumer
from platform_core.core.models.user import User
from tests.conftest import register_and_login


async def _course(db_session: AsyncSession, *, org_id: uuid.UUID | None = None) -> Course:
    course_id = uuid.uuid4()
    module = Module(id=uuid.uuid4(), course_id=course_id, title="Module 1", position=0)
    course = Course(
        id=course_id,
        title="Production Course",
        category="web_development",
        level="beginner",
        instructor_user_id=uuid.uuid4(),
        status="published",
        org_id=org_id,
    )
    module.lessons = [
        Lesson(
            id=uuid.uuid4(),
            module_id=module.id,
            title="Lesson 1",
            kind="article",
            duration_seconds=10,
            position=0,
        ),
        Lesson(
            id=uuid.uuid4(),
            module_id=module.id,
            title="Lesson 2",
            kind="article",
            duration_seconds=10,
            position=1,
        ),
    ]
    db_session.add_all([course, module, *module.lessons])
    await db_session.commit()
    return course


@pytest.mark.asyncio
async def test_enrollment_is_idempotent_and_user_scoped(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    course = await _course(db_session)
    access_token = await register_and_login(client, "enroll@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}

    first = await client.post(f"/api/v1/courses/{course.id}/enroll", headers=headers)
    second = await client.post(f"/api/v1/courses/{course.id}/enroll", headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["user_id"] == second.json()["user_id"]


@pytest.mark.asyncio
async def test_enrollment_requires_authentication(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    course = await _course(db_session)

    response = await client.post(f"/api/v1/courses/{course.id}/enroll")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_enrollment_rejects_invalid_unpublished_and_cross_tenant_courses(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "tenant-learner@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}
    unpublished = await _course(db_session)
    await db_session.execute(
        update(Course).where(Course.id == unpublished.id).values(status="draft")
    )
    await db_session.commit()

    invalid = await client.post(f"/api/v1/courses/{uuid.uuid4()}/enroll", headers=headers)
    draft = await client.post(f"/api/v1/courses/{unpublished.id}/enroll", headers=headers)

    assert invalid.status_code == 404
    assert draft.status_code == 404

    org_a = uuid.uuid4()
    org_b = uuid.uuid4()
    scoped_course = await _course(db_session, org_id=org_a)
    user_id = (
        await db_session.execute(select(User.id).where(User.email == "tenant-learner@example.com"))
    ).scalar_one()
    await db_session.execute(update(User).where(User.id == user_id).values(org_id=org_b))
    await db_session.commit()

    cross_tenant = await client.post(f"/api/v1/courses/{scoped_course.id}/enroll", headers=headers)
    assert cross_tenant.status_code == 404


@pytest.mark.asyncio
async def test_progress_is_server_derived_and_course_completion_emits_one_event(
    client: AsyncClient,
    db_session: AsyncSession,
    redis: fakeredis.FakeAsyncRedis,
) -> None:
    course = await _course(db_session)
    access_token = await register_and_login(client, "progress@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}
    user_id = (
        await db_session.execute(select(User.id).where(User.email == "progress@example.com"))
    ).scalar_one()
    await client.post(f"/api/v1/courses/{course.id}/enroll", headers=headers)
    lessons = sorted(course.modules[0].lessons, key=lambda lesson: lesson.position)

    spoofed = await client.post(
        f"/api/v1/lessons/{lessons[0].id}/progress",
        headers=headers,
        json={"position_seconds": 10, "completed": True},
    )
    assert spoofed.status_code == 422

    first = await client.post(
        f"/api/v1/lessons/{lessons[0].id}/progress",
        headers=headers,
        json={"position_seconds": 10},
    )
    second = await client.post(
        f"/api/v1/lessons/{lessons[1].id}/progress",
        headers=headers,
        json={"position_seconds": 10},
    )

    assert first.status_code == 200
    assert first.json()["enrollment"]["progress_pct"] == 50.0
    assert second.status_code == 200
    assert second.json()["enrollment"]["status"] == "completed"

    consumer = EventConsumer(group="course-test", consumer_name="worker", redis=redis)
    messages = [message async for message in consumer.read_batch(count=10, block_ms=100)]
    assert len(messages) == 1
    assert messages[0].event is not None
    await consumer.ack(messages[0].message_id)
    await GamificationEventProcessor(db_session).process(messages[0].event)
    await db_session.commit()
    context = await ProgressContextResolver(db_session).resolve(user_id)
    assert context.rank.completion_xp == 400

    repeated = await client.post(
        f"/api/v1/lessons/{lessons[1].id}/progress",
        headers=headers,
        json={"position_seconds": 10},
    )
    assert repeated.status_code == 200
    messages_after_repeat = [
        message async for message in consumer.read_batch(count=10, block_ms=100)
    ]
    assert messages_after_repeat == []


async def _course_with_lessons(
    db_session: AsyncSession, *, org_id: uuid.UUID | None = None
) -> tuple[Course, Lesson, Lesson]:
    """A published course with a public preview lesson and a locked article lesson.

    Returns the ORM objects directly so tests never lazy-load relationships outside a
    greenlet.
    """
    course_id = uuid.uuid4()
    module = Module(id=uuid.uuid4(), course_id=course_id, title="Module 1", position=0)
    preview_lesson = Lesson(
        id=uuid.uuid4(),
        module_id=module.id,
        title="Preview lesson",
        kind="article",
        duration_seconds=10,
        position=0,
        is_preview=True,
        preview_body="public preview body",
    )
    locked_lesson = Lesson(
        id=uuid.uuid4(),
        module_id=module.id,
        title="Locked lesson",
        kind="article",
        duration_seconds=10,
        position=1,
        is_preview=False,
        preview_body="locked article body",
    )
    module.lessons = [preview_lesson, locked_lesson]
    course = Course(
        id=course_id,
        title="Lesson Access Course",
        category="web_development",
        level="beginner",
        instructor_user_id=uuid.uuid4(),
        status="published",
        org_id=org_id,
    )
    db_session.add_all([course, module, preview_lesson, locked_lesson])
    await db_session.commit()
    return course, preview_lesson, locked_lesson


@pytest.mark.asyncio
async def test_lesson_content_requires_enrollment(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, locked_lesson, _ = await _course_with_lessons(db_session)
    access_token = await register_and_login(client, "lesson-guest@example.com")

    response = await client.get(
        f"/api/v1/lessons/{locked_lesson.id}",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_lesson_content_requires_authentication(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, _, locked_lesson = await _course_with_lessons(db_session)

    response = await client.get(f"/api/v1/lessons/{locked_lesson.id}")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_lesson_content_delivers_article_body_to_enrolled_learner(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    course, preview_lesson, _ = await _course_with_lessons(db_session)
    access_token = await register_and_login(client, "lesson-owner@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}
    await client.post(f"/api/v1/courses/{course.id}/enroll", headers=headers)

    response = await client.get(f"/api/v1/lessons/{preview_lesson.id}", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(preview_lesson.id)
    assert body["kind"] == "article"
    assert body["body"] == "public preview body"


@pytest.mark.asyncio
async def test_lesson_content_404s_for_foreign_tenant_draft_and_unknown_lessons(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "lesson-scope@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}
    user_id = (
        await db_session.execute(select(User.id).where(User.email == "lesson-scope@example.com"))
    ).scalar_one()
    org_a = uuid.uuid4()
    org_b = uuid.uuid4()
    await db_session.execute(update(User).where(User.id == user_id).values(org_id=org_a))
    await db_session.commit()

    foreign_course, _, foreign_lesson = await _course_with_lessons(db_session, org_id=org_b)
    draft_course, _, _ = await _course_with_lessons(db_session)
    await db_session.execute(
        update(Course).where(Course.id == draft_course.id).values(status="draft")
    )
    await db_session.commit()

    foreign_response = await client.get(
        f"/api/v1/lessons/{foreign_lesson.id}", headers=headers
    )
    draft_lesson = (
        await db_session.execute(
            select(Lesson.id)
            .join(Module, Module.id == Lesson.module_id)
            .where(Module.course_id == draft_course.id)
            .limit(1)
        )
    ).scalar_one()
    draft_response = await client.get(f"/api/v1/lessons/{draft_lesson}", headers=headers)
    unknown_response = await client.get(f"/api/v1/lessons/{uuid.uuid4()}", headers=headers)

    assert foreign_response.status_code == 404
    assert draft_response.status_code == 404
    assert unknown_response.status_code == 404


@pytest.mark.asyncio
async def test_course_detail_does_not_expose_non_preview_lesson_bodies(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    course, preview_lesson, locked_lesson = await _course_with_lessons(db_session)

    response = await client.get(f"/api/v1/courses/{course.id}")

    assert response.status_code == 200
    lessons = response.json()["syllabus"][0]["lessons"]
    bodies = {lesson["id"]: lesson["preview_body"] for lesson in lessons}
    assert bodies[str(preview_lesson.id)] == "public preview body"
    assert bodies[str(locked_lesson.id)] is None


@pytest.mark.asyncio
async def test_progress_beyond_lesson_duration_is_rejected(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    course = await _course(db_session)
    access_token = await register_and_login(client, "bounds@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}
    await client.post(f"/api/v1/courses/{course.id}/enroll", headers=headers)
    lesson = course.modules[0].lessons[0]

    response = await client.post(
        f"/api/v1/lessons/{lesson.id}/progress",
        headers=headers,
        json={"position_seconds": lesson.duration_seconds + 1},
    )

    assert response.status_code == 422
    progress = await client.get(f"/api/v1/courses/{course.id}/progress", headers=headers)
    assert progress.json()["completed_lesson_ids"] == []


@pytest.mark.asyncio
async def test_repeated_non_advancing_progress_reports_are_idempotent(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    course = await _course(db_session)
    access_token = await register_and_login(client, "noop-progress@example.com")
    headers = {"Authorization": f"Bearer {access_token}"}
    await client.post(f"/api/v1/courses/{course.id}/enroll", headers=headers)
    lesson = course.modules[0].lessons[0]

    first = await client.post(
        f"/api/v1/lessons/{lesson.id}/progress",
        headers=headers,
        json={"position_seconds": 5},
    )
    repeated = await client.post(
        f"/api/v1/lessons/{lesson.id}/progress",
        headers=headers,
        json={"position_seconds": 3},
    )

    assert first.status_code == 200
    assert repeated.status_code == 200
    assert repeated.json()["enrollment"]["progress_pct"] == first.json()["enrollment"][
        "progress_pct"
    ]
    assert repeated.json()["completed_lesson_ids"] == []
