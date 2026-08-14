"""Integration tier: the "real (trivial)" judge problem-listing routes. Hidden test cases are
never exposed (platform §2.4) — the list/detail responses only ever carry `Problem`'s public
fields.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

# Aliased: pytest's default collector treats any `Test*`-named class in a test module as a
# test class to instantiate, which would warn on this ORM model's __init__.
from judge.models import Problem, SampleCase
from judge.models import TestCase as HiddenTestCase


@pytest.mark.asyncio
async def test_list_problems(client: AsyncClient, db_session: AsyncSession) -> None:
    problem = Problem(
        id=uuid.uuid4(),
        slug="two-sum",
        title="Two Sum",
        difficulty="easy",
        statement="Find two numbers.",
    )
    db_session.add(problem)
    await db_session.commit()

    response = await client.get("/api/v1/problems")

    assert response.status_code == 200
    slugs = [p["slug"] for p in response.json()]
    assert "two-sum" in slugs


@pytest.mark.asyncio
async def test_get_problem_exposes_sample_cases_but_not_hidden_test_count_details(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    problem_id = uuid.uuid4()
    problem = Problem(
        id=problem_id, slug="fizzbuzz", title="FizzBuzz", difficulty="easy", statement="Classic."
    )
    sample = SampleCase(
        id=uuid.uuid4(), problem_id=problem_id, input="3", output="Fizz", position=0
    )
    hidden = HiddenTestCase(
        id=uuid.uuid4(), problem_id=problem_id, input="15", expected_output="FizzBuzz"
    )
    db_session.add_all([problem, sample, hidden])
    await db_session.commit()

    response = await client.get(f"/api/v1/problems/{problem_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["sample_cases"] == [{"input": "3", "output": "Fizz", "explanation": None}]
    assert body["hidden_test_count"] == 1
    assert "expected_solution" not in body or body["expected_solution"] is None


@pytest.mark.asyncio
async def test_get_problem_404s_for_an_unknown_id(client: AsyncClient) -> None:
    response = await client.get(f"/api/v1/problems/{uuid.uuid4()}")
    assert response.status_code == 404
