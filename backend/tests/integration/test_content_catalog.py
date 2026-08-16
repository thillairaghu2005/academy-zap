"""Integration tier: the "real (trivial)" content routes — a plain SELECT off tables that exist
(content/routes/course.py), as opposed to the 501-stub enroll/progress/manifest routes.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from content.models import Course, Lesson, Module
from platform_core.core.models.user import User
from tests.conftest import register_and_login


@pytest.mark.asyncio
async def test_list_courses_returns_only_published_courses(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    published = Course(
        id=uuid.uuid4(),
        title="Intro to Zapsters",
        category="web_development",
        level="beginner",
        instructor_user_id=uuid.uuid4(),
        status="published",
    )
    draft = Course(
        id=uuid.uuid4(),
        title="Unfinished Draft",
        category="web_development",
        level="beginner",
        instructor_user_id=uuid.uuid4(),
        status="draft",
    )
    db_session.add_all([published, draft])
    await db_session.commit()

    response = await client.get("/api/v1/courses")

    assert response.status_code == 200
    body = response.json()
    titles = [item["title"] for item in body["items"]]
    assert "Intro to Zapsters" in titles
    assert "Unfinished Draft" not in titles


@pytest.mark.asyncio
async def test_get_course_returns_syllabus(client: AsyncClient, db_session: AsyncSession) -> None:
    course_id = uuid.uuid4()
    module_id = uuid.uuid4()
    course = Course(
        id=course_id,
        title="Structured Course",
        category="cyber_security",
        level="intermediate",
        instructor_user_id=uuid.uuid4(),
        status="published",
    )
    module = Module(id=module_id, course_id=course_id, title="Module 1", position=0)
    lesson = Lesson(
        id=uuid.uuid4(),
        module_id=module_id,
        title="Lesson 1",
        kind="video",
        duration_seconds=600,
        position=0,
        is_preview=True,
    )
    db_session.add_all([course, module, lesson])
    await db_session.commit()

    response = await client.get(f"/api/v1/courses/{course_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["syllabus"][0]["lessons"][0]["title"] == "Lesson 1"


@pytest.mark.asyncio
async def test_get_course_404s_for_an_unknown_id(client: AsyncClient) -> None:
    response = await client.get(f"/api/v1/courses/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_course_does_not_expose_a_draft(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    draft = Course(
        id=uuid.uuid4(),
        title="Private Draft",
        category="web_development",
        level="beginner",
        instructor_user_id=uuid.uuid4(),
        status="draft",
    )
    db_session.add(draft)
    await db_session.commit()

    response = await client.get(f"/api/v1/courses/{draft.id}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_catalog_does_not_expose_courses_from_another_organization(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "catalog-tenant@example.com")
    user_id = (
        await db_session.execute(select(User.id).where(User.email == "catalog-tenant@example.com"))
    ).scalar_one()
    organization_a = uuid.uuid4()
    organization_b = uuid.uuid4()
    await db_session.execute(update(User).where(User.id == user_id).values(org_id=organization_a))
    visible = Course(
        id=uuid.uuid4(),
        title="Visible Organization Course",
        category="web_development",
        level="beginner",
        instructor_user_id=uuid.uuid4(),
        status="published",
        org_id=organization_a,
    )
    hidden = Course(
        id=uuid.uuid4(),
        title="Hidden Organization Course",
        category="web_development",
        level="beginner",
        instructor_user_id=uuid.uuid4(),
        status="published",
        org_id=organization_b,
    )
    db_session.add_all([visible, hidden])
    await db_session.commit()

    response = await client.get(
        "/api/v1/courses",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 200
    titles = [item["title"] for item in response.json()["items"]]
    assert "Visible Organization Course" in titles
    assert "Hidden Organization Course" not in titles
