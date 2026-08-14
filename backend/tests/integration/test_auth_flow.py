"""Integration tier (SOP §12): full HTTP -> route -> service -> real throwaway Postgres +
fakeredis. Register -> login -> access a protected route -> refresh -> logout, and the old
access token is denylist-rejected post-logout.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_login_access_refresh_logout_flow(client: AsyncClient) -> None:
    register_response = await client.post(
        "/api/v1/auth/register",
        json={
            "display_name": "Ada Lovelace",
            "email": "ada@example.com",
            "password": "correct-horse-1",
        },
    )
    assert register_response.status_code == 200
    body = register_response.json()
    assert body["user"]["email"] == "ada@example.com"
    assert "refresh_token" not in body["tokens"]
    assert "zapsters_refresh" in register_response.cookies
    assert (
        "hashed_password" not in body["user"]
    )  # SOP §8.3: sensitive fields excluded by construction

    login_response = await client.post(
        "/api/v1/auth/login", json={"email": "ada@example.com", "password": "correct-horse-1"}
    )
    assert login_response.status_code == 200
    tokens = login_response.json()["tokens"]
    access_token = tokens["access_token"]
    assert "refresh_token" not in tokens
    rotated_token = login_response.cookies.get("zapsters_refresh")
    assert rotated_token

    me_response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "ada@example.com"

    refresh_response = await client.post(
        "/api/v1/auth/refresh", headers={"Origin": "http://localhost:3000"}
    )
    assert refresh_response.status_code == 200
    new_access_token = refresh_response.json()["access_token"]
    assert new_access_token != access_token

    # The old refresh token is rotated out — reusing it must fail.
    client.cookies.set("zapsters_refresh", rotated_token)
    reuse_response = await client.post(
        "/api/v1/auth/refresh", headers={"Origin": "http://localhost:3000"}
    )
    assert reuse_response.status_code == 401

    logout_response = await client.post(
        "/api/v1/auth/logout",
        headers={
            "Authorization": f"Bearer {new_access_token}",
            "Origin": "http://localhost:3000",
        },
    )
    assert logout_response.status_code == 204

    # The just-logged-out access token is now denylisted.
    post_logout_response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access_token}"}
    )
    assert post_logout_response.status_code == 401


@pytest.mark.asyncio
async def test_duplicate_registration_is_rejected(client: AsyncClient) -> None:
    payload = {
        "display_name": "Grace Hopper",
        "email": "grace@example.com",
        "password": "correct-horse-2",
    }
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 200

    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_login_with_wrong_password_is_rejected(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={
            "display_name": "Alan Turing",
            "email": "alan@example.com",
            "password": "correct-horse-3",
        },
    )

    response = await client.post(
        "/api/v1/auth/login", json={"email": "alan@example.com", "password": "wrong-password"}
    )
    assert response.status_code == 401
