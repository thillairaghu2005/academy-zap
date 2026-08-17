"""Security tier (SOP §12): authorization boundaries against routes that actually exist (§8.5)
— never a boundary check against a route that doesn't, which would pass for the wrong reason.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from platform_core.core.models.audit_log import AuditLog
from platform_core.core.models.user import User
from tests.conftest import register_and_login


@pytest.mark.asyncio
async def test_protected_route_rejects_unauthenticated_requests(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_rejects_a_garbage_bearer_token(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_route_rejects_a_regular_user(client: AsyncClient) -> None:
    access_token = await register_and_login(client, "regular-user@example.com")

    response = await client.get(
        "/api/v1/admin/audit", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_route_allows_platform_ops(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "ops-user@example.com")

    # `get_current_user` (platform_core/core/deps.py) re-fetches the user row from the DB on
    # every request rather than trusting a role claim baked into the token, so elevating the
    # role here takes effect on the token already issued above — no re-login needed.
    await db_session.execute(
        update(User).where(User.email == "ops-user@example.com").values(role="platform_ops")
    )
    await db_session.commit()

    response = await client.get(
        "/api/v1/admin/audit", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_org_admin_cannot_read_another_org_audit_log(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    access_token = await register_and_login(client, "tenant-admin@example.com")
    org_id = uuid.uuid4()
    other_org_id = uuid.uuid4()
    admin_id = (
        await db_session.execute(select(User.id).where(User.email == "tenant-admin@example.com"))
    ).scalar_one()
    await db_session.execute(
        update(User).where(User.id == admin_id).values(role="org_admin", org_id=org_id)
    )
    db_session.add_all(
        [
            AuditLog(
                actor_user_id=admin_id,
                org_id=org_id,
                action="own",
                resource_type="course",
                resource_id="own-course",
                context={},
            ),
            AuditLog(
                actor_user_id=admin_id,
                org_id=other_org_id,
                action="other",
                resource_type="course",
                resource_id="other-course",
                context={},
            ),
        ]
    )
    await db_session.commit()

    response = await client.get(
        "/api/v1/admin/audit", headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 200
    resource_ids = [entry["resource_id"] for entry in response.json()]
    assert resource_ids == ["own-course"]


@pytest.mark.asyncio
async def test_refresh_cookie_rejects_an_untrusted_origin(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={
            "display_name": "CSRF Test",
            "email": "csrf-test@example.com",
            "password": "correct-horse-5",
        },
    )

    response = await client.post(
        "/api/v1/auth/refresh", headers={"Origin": "https://attacker.example"}
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_a_foundation_stub_route_returns_the_documented_501_shape(
    client: AsyncClient,
) -> None:
    access_token = await register_and_login(client, "stub-route-user@example.com")

    # The global leaderboard is now a real projection read; the still-stubbed non-global
    # scope (guild) is the typed 501 surface that documents the deferred feature.
    response = await client.get(
        "/api/v1/leaderboards/guild", headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 501
    body = response.json()
    assert body["subsystem"] == "guild/org leaderboards"
    assert body["see"].startswith("ZAPSTERS_GAMIFICATION_ENGINE.md")
