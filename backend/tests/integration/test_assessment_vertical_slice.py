"""Deterministic MCQ assessment -> event -> gamification integration."""

import uuid

import fakeredis
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from assessments.models import Assessment, Question
from content.models import Course, Enrollment
from gamification.context.resolver import ProgressContextResolver
from gamification.services.event_processor import GamificationEventProcessor
from platform_core.bus.consumer import EventConsumer
from tests.conftest import register_and_login


async def _assessment(
    db_session: AsyncSession, *, user_id: uuid.UUID | None = None
) -> Assessment:
    course = Course(
        id=uuid.uuid4(),
        title="Assessment Host Course",
        category="web_development",
        level="beginner",
        status="published",
        instructor_user_id=uuid.uuid4(),
    )
    db_session.add(course)
    await db_session.flush()
    if user_id is not None:
        db_session.add(Enrollment(course_id=course.id, user_id=user_id))
    assessment = Assessment(
        id=uuid.uuid4(),
        slug=f"mcq-{uuid.uuid4()}",
        title="MCQ Foundations",
        category="web_development",
        description="Deterministic MCQ assessment.",
        attempts_allowed=2,
        estimated_minutes=30,
        passing_percent=40,
        course_id=course.id,
    )
    assessment.questions = [
        Question(
            id=uuid.uuid4(),
            assessment_id=assessment.id,
            type="mcq",
            difficulty="easy",
            prompt="Pick the first option.",
            options=["Wrong", "Correct"],
            accepted_answers=["1"],
            position=0,
        ),
        Question(
            id=uuid.uuid4(),
            assessment_id=assessment.id,
            type="mcq",
            difficulty="medium",
            prompt="Pick the second option.",
            options=["Correct", "Wrong"],
            accepted_answers=["0"],
            position=1,
        ),
    ]
    db_session.add(assessment)
    await db_session.commit()
    return assessment


@pytest.mark.asyncio
async def test_mcq_assessment_is_server_graded_and_feeds_gamification(
    client: AsyncClient,
    db_session: AsyncSession,
    redis: fakeredis.FakeAsyncRedis,
) -> None:
    access_token = await register_and_login(client, "assessment@example.com")
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    user_id = uuid.UUID(me.json()["id"])
    assessment = await _assessment(db_session, user_id=user_id)
    headers = {"Authorization": f"Bearer {access_token}"}
    question_ids = [question.id for question in assessment.questions]

    started = await client.post(f"/api/v1/assessments/{assessment.id}/attempts", headers=headers)
    assert started.status_code == 201
    attempt_id = started.json()["attempt_id"]

    first = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit",
        headers=headers,
        json={"question_id": str(question_ids[0]), "option_index": 1, "time_spent_ms": 2_000},
    )
    spoofed = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit",
        headers=headers,
        json={
            "question_id": str(question_ids[0]),
            "option_index": 1,
            "time_spent_ms": 2_000,
            "user_id": str(uuid.uuid4()),
        },
    )
    second = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit",
        headers=headers,
        json={"question_id": str(question_ids[1]), "option_index": 1, "time_spent_ms": 2_000},
    )
    duplicate = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit",
        headers=headers,
        json={"question_id": str(question_ids[0]), "option_index": 1, "time_spent_ms": 2_000},
    )

    assert first.status_code == 200
    assert spoofed.status_code == 422
    assert first.json()["correct"] is True
    assert second.status_code == 200
    assert second.json()["correct"] is False
    assert duplicate.status_code == 409

    final = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit-final", headers=headers
    )
    assert final.status_code == 200
    assert final.json()["score"] == 10
    assert final.json()["total_score"] == 25
    assert final.json()["passed"] is True
    repeated_final = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit-final", headers=headers
    )
    assert repeated_final.status_code == 409

    from tests.conftest import drain_outbox_for_test
    await drain_outbox_for_test(db_session, redis)

    consumer = EventConsumer(group="assessment-test", consumer_name="worker", redis=redis)
    messages = [message async for message in consumer.read_batch(count=10, block_ms=100)]
    assert len(messages) == 1
    assert messages[0].event is not None
    await consumer.ack(messages[0].message_id)
    await GamificationEventProcessor(db_session).process(messages[0].event)
    await db_session.commit()
    user_id = uuid.UUID((await client.get("/api/v1/auth/me", headers=headers)).json()["id"])
    context = await ProgressContextResolver(db_session).resolve(user_id)
    assert context.rank.mastery_xp == 200


@pytest.mark.asyncio
async def test_assessment_attempt_is_not_readable_by_another_user(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token = await register_and_login(client, "assessment-owner@example.com")
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {owner_token}"}
    )
    owner_id = uuid.UUID(me.json()["id"])
    assessment = await _assessment(db_session, user_id=owner_id)
    started = await client.post(
        f"/api/v1/assessments/{assessment.id}/attempts",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    other_token = await register_and_login(client, "assessment-other@example.com")

    response = await client.get(
        f"/api/v1/assessments/attempts/{started.json()['attempt_id']}",
        headers={"Authorization": f"Bearer {other_token}"},
    )

    assert response.status_code == 404
