"""B3 security tier — review queue authorization + immutability (Phase 12).

Attackers can never: view the queue without admin RBAC, review another org's credentials,
spoof the reviewer/org from the request body, or mutate credential status outside the
server-owned transition table. History is append-only — there is no delete endpoint.
"""

import uuid
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis

from gamification.models import CredentialStatusHistory
from gamification.repositories.badges import CredentialRepository
from gamification.services.event_processor import GamificationEventProcessor
from platform_core.core.config import settings
from platform_core.core.db.session import get_session
from platform_core.core.models.user import User
from platform_core.core.rbac import Role
from platform_core.core.redis import get_redis
from platform_core.events.schema import AssessmentSubmittedEvent
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
    await FastAPILimiter.init(real_redis, prefix=f"fastapi-limiter-b3sec-{uuid.uuid4().hex}")
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac, real_redis
    finally:
        await FastAPILimiter.close()
        app.dependency_overrides.clear()
        await real_redis.close()


async def _flagged_credential(
    db_session: AsyncSession, user_id: uuid.UUID, *, org_id: uuid.UUID | None = None
) -> uuid.UUID:
    event = AssessmentSubmittedEvent(
        user_id=user_id,
        org_id=org_id,
        idempotency_key=f"b3-sec:{uuid.uuid4()}",
        session_fingerprint=f"auth:{user_id}",
        assessment_id=uuid.uuid4(),
        assessment_kind="main",
        score_pct=100.0,
        max_score=10.0,
        time_taken_seconds=5,
        attempt_number=1,
        question_level_answers=[
            {
                "question_id": str(uuid.uuid4()),
                "option_index": 0,
                "time_spent_ms": 100,
            }
            for _ in range(10)
        ],
    )
    await GamificationEventProcessor(db_session).process(event)
    await db_session.commit()
    credentials = await CredentialRepository(db_session).list_for_user(user_id)
    return credentials[0].id


async def _set_role(
    db_session: AsyncSession, user_id: str, *, role: Role, org_id: uuid.UUID | None = None
) -> None:
    await db_session.execute(
        update(User).where(User.id == user_id).values(role=role.value, org_id=org_id)
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_anonymous_and_normal_user_denied(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    client, _redis = real_redis_client
    learner_token = await register_and_login(client, "b3sec-denied@example.com")
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {learner_token}"}
    )
    credential_id = await _flagged_credential(db_session, uuid.UUID(me.json()["id"]))

    # Anonymous -> 401 on every review surface.
    assert (await client.get("/api/v1/admin/reviews/credentials")).status_code == 401
    assert (
        await client.get(f"/api/v1/admin/reviews/credentials/{credential_id}")
    ).status_code == 401

    # Normal user (learner) -> 403.
    headers = {"Authorization": f"Bearer {learner_token}"}
    response = await client.get("/api/v1/admin/reviews/credentials", headers=headers)
    assert response.status_code == 403
    assert (
        await client.post(
            f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
            json={"to_status": "verified"},
            headers=headers,
        )
    ).status_code == 403


@pytest.mark.asyncio
async def test_org_admin_cannot_see_or_review_another_org(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    client, _redis = real_redis_client
    org_a = uuid.uuid4()
    org_b = uuid.uuid4()

    admin_b_token = await register_and_login(client, "b3sec-admin-b@example.com")
    me_b = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_b_token}"}
    )
    await _set_role(db_session, me_b.json()["id"], role=Role.ORG_ADMIN, org_id=org_b)

    learner_a_token = await register_and_login(client, "b3sec-learner-a@example.com")
    me_a = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {learner_a_token}"}
    )
    credential_id = await _flagged_credential(
        db_session, uuid.UUID(me_a.json()["id"]), org_id=org_a
    )

    admin_b_headers = {"Authorization": f"Bearer {admin_b_token}"}
    # Org B's admin sees an empty queue and cannot fetch Org A's credential.
    queue = await client.get("/api/v1/admin/reviews/credentials", headers=admin_b_headers)
    assert queue.status_code == 200
    assert queue.json() == []
    detail = await client.get(
        f"/api/v1/admin/reviews/credentials/{credential_id}", headers=admin_b_headers
    )
    assert detail.status_code == 404
    transition = await client.post(
        f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
        json={"to_status": "revoked"},
        headers=admin_b_headers,
    )
    assert transition.status_code == 404


@pytest.mark.asyncio
async def test_client_cannot_spoof_reviewer_or_org(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    """The reviewer and org scope come from the token — body fields are ignored."""
    client, _redis = real_redis_client
    admin_token = await register_and_login(client, "b3sec-spoof@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    admin_id = me.json()["id"]
    await _set_role(db_session, admin_id, role=Role.PLATFORM_OPS)

    learner_token = await register_and_login(client, "b3sec-spoof-learner@example.com")
    me_learner = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {learner_token}"}
    )
    credential_id = await _flagged_credential(
        db_session, uuid.UUID(me_learner.json()["id"])
    )

    spoofed_org = str(uuid.uuid4())
    transition = await client.post(
        f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
        json={
            "to_status": "verified",
            "reason": "clean",
            "reviewer_id": str(uuid.uuid4()),  # ignored
            "org_id": spoofed_org,  # ignored
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert transition.status_code == 200

    # The recorded reviewer is the authenticated admin, and the org is the credential's own.
    result = await db_session.execute(
        select(CredentialStatusHistory).where(
            CredentialStatusHistory.credential_id == credential_id
        )
    )
    history = result.scalars().all()
    assert len(history) == 1
    assert str(history[0].reviewer_id) == admin_id
    assert str(history[0].org_id) != spoofed_org


@pytest.mark.asyncio
async def test_no_direct_status_mutation_and_no_history_deletion(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    """There is no endpoint that accepts an arbitrary status write, and no endpoint deletes
    history — status changes only flow through the transition table."""
    client, _redis = real_redis_client
    admin_token = await register_and_login(client, "b3sec-mutate@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    await _set_role(db_session, me.json()["id"], role=Role.PLATFORM_OPS)

    learner_token = await register_and_login(client, "b3sec-mutate-learner@example.com")
    me_learner = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {learner_token}"}
    )
    credential_id = await _flagged_credential(
        db_session, uuid.UUID(me_learner.json()["id"])
    )

    headers = {"Authorization": f"Bearer {admin_token}"}
    # Arbitrary status body is rejected by the transition model (only verified|revoked).
    arbitrary = await client.post(
        f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
        json={"to_status": "gold_plated"},
        headers=headers,
    )
    assert arbitrary.status_code == 422

    # No history-deletion endpoint exists (404/405).
    delete_attempt = await client.request(
        "DELETE",
        f"/api/v1/admin/reviews/credentials/{credential_id}/history",
        headers=headers,
    )
    assert delete_attempt.status_code in (404, 405)
