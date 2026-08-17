"""Security tier — badge/credential isolation + forgery resistance (slice 08, Phase 11-12).

Attackers can never: award themselves a badge, issue themselves a credential, change
credential status/ownership, spoof user/org identity on reads, read another user's awards,
or forge a credential id. The frontend is never an authority — there is no award/issue
endpoint at all.
"""

import uuid
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis

from gamification.services.event_processor import GamificationEventProcessor
from platform_core.core.config import settings
from platform_core.core.db.session import get_session
from platform_core.core.redis import get_redis
from platform_core.events.schema import CourseCompletedEvent
from tests.conftest import register_and_login


@pytest_asyncio.fixture
async def real_redis_client(
    db_session: AsyncSession,
) -> AsyncGenerator[tuple[AsyncClient, AsyncRedis]]:
    real_redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def _override_get_session() -> AsyncGenerator[AsyncSession]:
        yield db_session

    async def _override_get_redis() -> AsyncGenerator[AsyncRedis]:
        yield real_redis

    from fastapi_limiter import FastAPILimiter

    from main import app

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_redis] = _override_get_redis
    await FastAPILimiter.init(real_redis, prefix=f"fastapi-limiter-badgesec-{uuid.uuid4().hex}")
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac, real_redis
    finally:
        await FastAPILimiter.close()
        app.dependency_overrides.clear()
        await real_redis.close()


async def _award_first_course(
    db_session: AsyncSession, user_id: uuid.UUID
) -> None:
    """Seed one authoritative award the way production does — through the event processor."""
    event = CourseCompletedEvent(
        user_id=user_id,
        idempotency_key=f"security-course:{uuid.uuid4()}",
        session_fingerprint=f"auth:{user_id}",
        course_id=uuid.uuid4(),
        category="web_development",
        time_spent_seconds=3_600,
    )
    await GamificationEventProcessor(db_session).process(event)
    await db_session.commit()


@pytest.mark.asyncio
async def test_user_cannot_read_another_users_badges(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    """Phase 11 — User A's token never reveals User B's awards (user_id is server-derived
    from the token; the route ignores any client-supplied identity)."""
    client, _redis = real_redis_client
    user_a_token = await register_and_login(client, "badgesec-a@example.com")
    me_a = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {user_a_token}"}
    )
    user_a_id = uuid.UUID(me_a.json()["id"])

    user_b_token = await register_and_login(client, "badgesec-b@example.com")
    await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {user_b_token}"})

    await _award_first_course(db_session, user_a_id)

    # A sees their own badge.
    a_badges = await client.get(
        "/api/v1/me/badges", headers={"Authorization": f"Bearer {user_a_token}"}
    )
    assert a_badges.status_code == 200
    assert [b["badge_id"] for b in a_badges.json()] == ["first_course_completed"]

    # B sees nothing — even though A has an award.
    b_badges = await client.get(
        "/api/v1/me/badges", headers={"Authorization": f"Bearer {user_b_token}"}
    )
    assert b_badges.status_code == 200
    assert b_badges.json() == []


@pytest.mark.asyncio
async def test_no_award_or_issue_endpoint_exists(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    """Phase 12 — the frontend can never award itself a badge or issue a credential: there
    is no such route (FastAPI answers unknown methods/routes with 404/405, not with a grant)."""
    client, _redis = real_redis_client
    token = await register_and_login(client, "badgesec-forge@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    for path, payload in [
        ("/api/v1/me/badges", {"badge_id": "perfect_assessment"}),
        ("/api/v1/credentials", {"credential_earned": True}),
        ("/api/v1/me/credentials", {"type": "badge"}),
        ("/api/v1/badges/award", {"badge_id": "perfect_assessment"}),
    ]:
        response = await client.post(path, json=payload, headers=headers)
        assert response.status_code in (404, 405), f"{path} must not award anything"


@pytest.mark.asyncio
async def test_public_verify_exposes_only_public_fields(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    """Phase 10 — the public verify response contains exactly the product's public claim
    surface: no email, no auth/internal ids, no org metadata, no tokens."""
    client, _redis = real_redis_client
    token = await register_and_login(client, "badgesec-verify@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_id = uuid.UUID(me.json()["id"])
    await _award_first_course(db_session, user_id)

    badges = await client.get(
        "/api/v1/me/badges", headers={"Authorization": f"Bearer {token}"}
    )
    credential_id = badges.json()[0]["credential_id"]

    response = await client.get(f"/api/v1/verify/{credential_id}")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "credential_id",
        "badge_name",
        "issuer",
        "subject",
        "claim",
        "signature",
        "status",
        "note",
    }
    assert set(body["subject"]) == {"user_id", "display_name"}
    assert set(body["claim"]) == {"category", "earned_at", "level", "rank_name"}
    serialized = response.text.lower()
    assert "email" not in serialized
    assert "token" not in serialized
    assert "password" not in serialized
    assert "org_id" not in serialized
    assert "session" not in serialized


@pytest.mark.asyncio
async def test_badges_read_is_authenticated_and_tamper_proof(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
) -> None:
    client, _redis = real_redis_client
    # No token -> 401.
    assert (await client.get("/api/v1/me/badges")).status_code == 401
    # Garbage token -> 401.
    assert (
        await client.get(
            "/api/v1/me/badges", headers={"Authorization": "Bearer not-a-real-token"}
        )
    ).status_code == 401
