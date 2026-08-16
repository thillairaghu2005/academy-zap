"""Integration tier: the assessment catalog routes under the slice 03 access gate.

An assessment is visible only to an authenticated user who is enrolled in the assessment's
published, tenant-visible course (slice 03 §2). Unauthenticated access is blocked.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from assessments.models import Assessment, Question
from content.models import Course, Enrollment
from tests.conftest import register_and_login


async def _course_with_assessment(
    db_session: AsyncSession,
    *,
    user_id: uuid.UUID | None = None,
    assessment_status: str = "published",
) -> tuple[uuid.UUID, uuid.UUID]:
    course_id = uuid.uuid4()
    db_session.add(
        Course(
            id=course_id,
            title="Assessment Host Course",
            category="web_development",
            level="beginner",
            status="published",
            instructor_user_id=uuid.uuid4(),
        )
    )
    await db_session.flush()
    if user_id is not None:
        db_session.add(Enrollment(course_id=course_id, user_id=user_id))
    assessment = Assessment(
        id=uuid.uuid4(),
        slug=f"quiz-{uuid.uuid4().hex[:8]}",
        title="Quiz",
        category="web_development",
        status=assessment_status,
        course_id=course_id,
    )
    db_session.add(assessment)
    await db_session.commit()
    return course_id, assessment.id


@pytest.mark.asyncio
async def test_list_assessments_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/assessments")
    assert response.status_code == 401


async def _user_id(client: AsyncClient, access_token: str) -> uuid.UUID:
    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    return uuid.UUID(response.json()["id"])


@pytest.mark.asyncio
async def test_list_assessments_shows_only_enrolled_published_assessments(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "catalog-tenant@example.com")
    user_id = await _user_id(client, access_token)
    _, assessment_id = await _course_with_assessment(db_session, user_id=user_id)
    headers = {"Authorization": f"Bearer {access_token}"}

    response = await client.get("/api/v1/assessments", headers=headers)

    assert response.status_code == 200
    assert any(item["id"] == str(assessment_id) for item in response.json())


@pytest.mark.asyncio
async def test_unenrolled_user_does_not_see_the_assessment_in_the_catalog(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "catalog-unenrolled@example.com")
    await _user_id(client, access_token)
    # The host course exists but this user is not enrolled in it.
    await _course_with_assessment(db_session)

    response = await client.get(
        "/api/v1/assessments", headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_assessment_never_exposes_accepted_answers_or_reference_solutions(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "catalog-detail@example.com")
    user_id = await _user_id(client, access_token)
    _, assessment_id = await _course_with_assessment(db_session, user_id=user_id)
    question_id = uuid.uuid4()
    db_session.add(
        Question(
            id=question_id,
            assessment_id=assessment_id,
            type="short_answer",
            difficulty="easy",
            prompt="What does HTML stand for?",
            accepted_answers=["HyperText Markup Language"],
        )
    )
    await db_session.commit()

    response = await client.get(
        f"/api/v1/assessments/{assessment_id}",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 200
    body = response.json()
    question_body = body["questions"][0]
    assert question_body["prompt"] == "What does HTML stand for?"
    assert question_body["accepted_answers"] is None
    assert question_body["reference_solution"] is None
