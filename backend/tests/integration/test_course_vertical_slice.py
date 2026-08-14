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
