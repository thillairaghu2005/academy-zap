"""Integration tier: the "real (trivial)" lab catalog routes — session provisioning stays 501."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from labs.models import Lab, LabObjective
from tests.conftest import register_and_login


@pytest.mark.asyncio
async def test_list_labs(client: AsyncClient, db_session: AsyncSession) -> None:
    lab = Lab(
        id=uuid.uuid4(),
        slug="linux-fundamentals",
        title="Linux Fundamentals",
        category="cyber_security",
        difficulty="beginner",
    )
    db_session.add(lab)
    await db_session.commit()

    response = await client.get("/api/v1/labs")

    assert response.status_code == 200
    slugs = [item["slug"] for item in response.json()]
    assert "linux-fundamentals" in slugs


@pytest.mark.asyncio
async def test_get_lab_includes_objectives(client: AsyncClient, db_session: AsyncSession) -> None:
    lab_id = uuid.uuid4()
    lab = Lab(
        id=lab_id,
        slug="find-the-flag",
        title="Find the Flag",
        category="ctf",
        difficulty="beginner",
    )
    objective = LabObjective(
        id="find-flag",
        lab_id=lab_id,
        title="Find the flag",
        description="It's in /root.",
        position=0,
    )
    db_session.add_all([lab, objective])
    await db_session.commit()

    response = await client.get(f"/api/v1/labs/{lab_id}")

    assert response.status_code == 200
    assert response.json()["objectives"][0]["id"] == "find-flag"


@pytest.mark.asyncio
async def test_lab_session_provisioning_is_a_foundation_stub(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab = Lab(
        id=uuid.uuid4(), slug="stub-lab", title="Stub Lab", category="ctf", difficulty="beginner"
    )
    db_session.add(lab)
    await db_session.commit()

    access_token = await register_and_login(client, "lab-session-user@example.com")
    response = await client.post(
        f"/api/v1/labs/{lab.id}/sessions", headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 501
    assert response.json()["subsystem"] == "labs"
