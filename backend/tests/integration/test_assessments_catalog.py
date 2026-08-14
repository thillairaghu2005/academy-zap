"""Integration tier: the "real (trivial)" assessment catalog routes. Attempt/grade stay 501 —
grading needs deterministic MCQ/short-answer rules and Judge Engine delegation for code
questions, neither built this round.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from assessments.models import Assessment, Question


@pytest.mark.asyncio
async def test_list_assessments(client: AsyncClient, db_session: AsyncSession) -> None:
    assessment = Assessment(
        id=uuid.uuid4(), slug="python-basics", title="Python Basics", category="web_development"
    )
    db_session.add(assessment)
    await db_session.commit()

    response = await client.get("/api/v1/assessments")

    assert response.status_code == 200
    slugs = [item["slug"] for item in response.json()]
    assert "python-basics" in slugs


@pytest.mark.asyncio
async def test_get_assessment_never_exposes_accepted_answers_or_reference_solutions(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    assessment_id = uuid.uuid4()
    assessment = Assessment(id=assessment_id, slug="quiz", title="Quiz", category="web_development")
    question = Question(
        id=uuid.uuid4(),
        assessment_id=assessment_id,
        type="short_answer",
        difficulty="easy",
        prompt="What does HTML stand for?",
        accepted_answers=["HyperText Markup Language"],
    )
    db_session.add_all([assessment, question])
    await db_session.commit()

    response = await client.get(f"/api/v1/assessments/{assessment_id}")

    assert response.status_code == 200
    body = response.json()
    question_body = body["questions"][0]
    assert question_body["prompt"] == "What does HTML stand for?"
    assert question_body["accepted_answers"] is None
    assert question_body["reference_solution"] is None
