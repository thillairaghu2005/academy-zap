"""Security tier (slice 03 §14): assessment access, tenant isolation, publication state,
attempt integrity, and the two-concurrent-finalization race.

The access gate is exercised over real HTTP; identities are always server-derived from the
bearer token (never from a client-supplied id).
"""

import asyncio
import uuid

import fakeredis
import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from assessments.models import Assessment, Question
from content.models import Course, Enrollment
from platform_core.core.models.user import User
from tests.conftest import register_and_login


async def _host_course(
    db_session: AsyncSession, *, org_id: uuid.UUID | None = None, status: str = "published"
) -> uuid.UUID:
    course_id = uuid.uuid4()
    db_session.add(
        Course(
            id=course_id,
            title="Assessment Security Course",
            category="web_development",
            level="beginner",
            status=status,
            org_id=org_id,
            instructor_user_id=uuid.uuid4(),
        )
    )
    await db_session.flush()
    return course_id


async def _assessment(
    db_session: AsyncSession,
    *,
    course_id: uuid.UUID,
    org_id: uuid.UUID | None = None,
    status: str = "published",
) -> Assessment:
    assessment = Assessment(
        id=uuid.uuid4(),
        slug=f"security-{uuid.uuid4().hex[:8]}",
        title="Security Assessment",
        category="web_development",
        description="Access-gated assessment.",
        attempts_allowed=3,
        estimated_minutes=30,
        passing_percent=50,
        course_id=course_id,
        org_id=org_id,
        status=status,
    )
    assessment.questions = [
        Question(
            id=uuid.uuid4(),
            assessment_id=assessment.id,
            type="mcq",
            difficulty="easy",
            prompt="Pick the correct option.",
            options=["Wrong", "Correct"],
            accepted_answers=["1"],
            position=0,
        )
    ]
    db_session.add(assessment)
    await db_session.commit()
    return assessment


async def _enroll(db_session: AsyncSession, course_id: uuid.UUID, user_id: uuid.UUID) -> None:
    db_session.add(Enrollment(course_id=course_id, user_id=user_id))
    await db_session.commit()


async def _user_id(client: AsyncClient, access_token: str) -> uuid.UUID:
    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    return uuid.UUID(response.json()["id"])


@pytest.mark.asyncio
async def test_unauthenticated_assessment_access_is_blocked(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    course_id = await _host_course(db_session)
    assessment = await _assessment(db_session, course_id=course_id)

    assert (await client.get("/api/v1/assessments")).status_code == 401
    assert (
        await client.get(f"/api/v1/assessments/{assessment.id}")
    ).status_code == 401
    assert (
        await client.post(f"/api/v1/assessments/{assessment.id}/attempts")
    ).status_code == 401


@pytest.mark.asyncio
async def test_unenrolled_user_cannot_read_or_start_the_assessment(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "un-enrolled@example.com")
    course_id = await _host_course(db_session)
    assessment = await _assessment(db_session, course_id=course_id)
    headers = {"Authorization": f"Bearer {access_token}"}

    detail = await client.get(f"/api/v1/assessments/{assessment.id}", headers=headers)
    started = await client.post(
        f"/api/v1/assessments/{assessment.id}/attempts", headers=headers
    )

    assert detail.status_code == 403
    assert started.status_code == 403


@pytest.mark.asyncio
async def test_cross_tenant_assessment_access_is_blocked(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "foreign-tenant@example.com")
    user_id = await _user_id(client, access_token)
    org_a = uuid.uuid4()
    org_b = uuid.uuid4()
    await db_session.execute(update(User).where(User.id == user_id).values(org_id=org_a))
    await db_session.commit()
    course_id = await _host_course(db_session, org_id=org_b)
    assessment = await _assessment(db_session, course_id=course_id, org_id=org_b)
    headers = {"Authorization": f"Bearer {access_token}"}

    detail = await client.get(f"/api/v1/assessments/{assessment.id}", headers=headers)
    started = await client.post(
        f"/api/v1/assessments/{assessment.id}/attempts", headers=headers
    )

    # Same 404 shape as a missing id — existence is not disclosed across tenants.
    assert detail.status_code == 404
    assert started.status_code == 404


@pytest.mark.asyncio
async def test_unpublished_assessment_is_blocked_even_for_an_enrolled_user(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "draft-viewer@example.com")
    user_id = await _user_id(client, access_token)
    course_id = await _host_course(db_session)
    await _enroll(db_session, course_id, user_id)
    assessment = await _assessment(db_session, course_id=course_id, status="draft")
    headers = {"Authorization": f"Bearer {access_token}"}

    detail = await client.get(f"/api/v1/assessments/{assessment.id}", headers=headers)
    started = await client.post(
        f"/api/v1/assessments/{assessment.id}/attempts", headers=headers
    )

    assert detail.status_code == 404
    assert started.status_code == 404


@pytest.mark.asyncio
async def test_assessment_without_a_course_is_never_accessible_by_guessing(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "no-course@example.com")
    await _user_id(client, access_token)
    assessment = await _assessment(db_session, course_id=uuid.uuid4(), status="published")
    # No course row exists for that id — the gate must not fall through.
    headers = {"Authorization": f"Bearer {access_token}"}

    detail = await client.get(f"/api/v1/assessments/{assessment.id}", headers=headers)

    assert detail.status_code == 404


@pytest.mark.asyncio
async def test_client_cannot_spoof_correctness_score_or_user_id(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "spoof-attempt@example.com")
    user_id = await _user_id(client, access_token)
    course_id = await _host_course(db_session)
    await _enroll(db_session, course_id, user_id)
    assessment = await _assessment(db_session, course_id=course_id)
    headers = {"Authorization": f"Bearer {access_token}"}
    started = await client.post(
        f"/api/v1/assessments/{assessment.id}/attempts", headers=headers
    )
    attempt_id = started.json()["attempt_id"]
    question_id = str(assessment.questions[0].id)

    spoofed = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit",
        headers=headers,
        json={
            "question_id": question_id,
            "option_index": 1,
            "time_spent_ms": 500,
            "correct": True,
            "score": 100,
            "user_id": str(uuid.uuid4()),
            "org_id": str(uuid.uuid4()),
            "enrollment_id": str(uuid.uuid4()),
        },
    )

    # `extra="forbid"` rejects every non-contract field (correctness/score/ids).
    assert spoofed.status_code == 422


@pytest.mark.asyncio
async def test_client_cannot_submit_to_another_users_attempt(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token = await register_and_login(client, "attempt-owner@example.com")
    owner_id = await _user_id(client, owner_token)
    course_id = await _host_course(db_session)
    await _enroll(db_session, course_id, owner_id)
    assessment = await _assessment(db_session, course_id=course_id)
    started = await client.post(
        f"/api/v1/assessments/{assessment.id}/attempts",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    attempt_id = started.json()["attempt_id"]

    intruder_token = await register_and_login(client, "attempt-intruder@example.com")
    intruder_id = await _user_id(client, intruder_token)
    await _enroll(db_session, course_id, intruder_id)
    headers = {"Authorization": f"Bearer {intruder_token}"}

    read = await client.get(f"/api/v1/assessments/attempts/{attempt_id}", headers=headers)
    finalize = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit-final", headers=headers
    )

    assert read.status_code == 404
    assert finalize.status_code == 404


@pytest.mark.asyncio
async def test_finalized_attempt_cannot_be_modified(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "finalized@example.com")
    user_id = await _user_id(client, access_token)
    course_id = await _host_course(db_session)
    await _enroll(db_session, course_id, user_id)
    assessment = await _assessment(db_session, course_id=course_id)
    headers = {"Authorization": f"Bearer {access_token}"}
    started = await client.post(
        f"/api/v1/assessments/{assessment.id}/attempts", headers=headers
    )
    attempt_id = started.json()["attempt_id"]
    question_id = str(assessment.questions[0].id)
    await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit",
        headers=headers,
        json={"question_id": question_id, "option_index": 1, "time_spent_ms": 500},
    )
    final = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit-final", headers=headers
    )
    assert final.status_code == 200

    resubmit = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit",
        headers=headers,
        json={"question_id": question_id, "option_index": 1, "time_spent_ms": 500},
    )
    repeat_final = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit-final", headers=headers
    )

    assert resubmit.status_code == 409
    assert repeat_final.status_code == 409


@pytest.mark.asyncio
async def test_two_concurrent_finalizations_produce_one_completion_and_one_event(
    postgres_test_db: str, redis: fakeredis.FakeAsyncRedis
) -> None:
    """Two simultaneous finalizations against the same attempt row (two independent DB
    connections) must yield exactly one 200 + one 409 and exactly one bus event.

    The ASGI test client shares a single SQLAlchemy session, so it cannot exercise real
    concurrency; this drives `AttemptService.submit` directly over two connections against the
    throwaway Postgres, which is what the row lock + status guard actually protect against.
    """
    from datetime import UTC, datetime, timedelta

    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

    from assessments.models import AssessmentSubmission
    from assessments.services.attempt import AttemptService
    from platform_core.bus.consumer import EventConsumer

    user_id = uuid.uuid4()
    course_id = uuid.uuid4()
    assessment_id = uuid.uuid4()
    question_id = uuid.uuid4()
    attempt_id = uuid.uuid4()
    engine = create_async_engine(postgres_test_db)
    try:
        now = datetime.now(UTC)
        async with AsyncSession(engine, expire_on_commit=False) as session:
            course = Course(
                id=course_id,
                title="Race Course",
                category="web_development",
                level="beginner",
                status="published",
                instructor_user_id=uuid.uuid4(),
            )
            assessment = Assessment(
                id=assessment_id,
                slug=f"race-{uuid.uuid4().hex[:8]}",
                title="Race Assessment",
                category="web_development",
                description="",
                attempts_allowed=3,
                estimated_minutes=30,
                passing_percent=50,
                course_id=course_id,
                status="published",
            )
            question = Question(
                id=question_id,
                assessment_id=assessment_id,
                type="mcq",
                difficulty="easy",
                prompt="Pick the correct option.",
                options=["Wrong", "Correct"],
                accepted_answers=["1"],
                position=0,
            )
            attempt = AssessmentSubmission(
                attempt_id=attempt_id,
                assessment_id=assessment_id,
                user_id=user_id,
                status="in_progress",
                attempt_number=1,
                started_at=now,
                expires_at=now + timedelta(minutes=30),
                question_level_answers=[
                    {
                        "question_id": str(question_id),
                        "option_index": 1,
                        "time_spent_ms": 500,
                        "correct": True,
                        "score": 10,
                        "submitted_at": now.isoformat(),
                    }
                ],
                score=10,
            )
            session.add_all([course, assessment, question, attempt])
            session.add(Enrollment(course_id=course_id, user_id=user_id))
            await session.commit()

        async def _finalize() -> int:
            async with AsyncSession(engine, expire_on_commit=False) as session:
                await AttemptService(session, redis).submit(attempt_id, user_id, None)
            return 200

        outcomes = await asyncio.gather(_finalize(), _finalize(), return_exceptions=True)
    finally:
        await engine.dispose()

    from platform_core.core.exceptions import ConflictError

    winners = [outcome for outcome in outcomes if outcome == 200]
    losers = [
        outcome for outcome in outcomes if isinstance(outcome, ConflictError)
    ]
    assert len(winners) == 1
    assert len(losers) == 1

    consumer = EventConsumer(group="security-race", consumer_name="worker", redis=redis)
    messages = [message async for message in consumer.read_batch(count=10, block_ms=100)]
    assert len(messages) == 1
    await consumer.ack(messages[0].message_id)
