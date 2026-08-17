"""B3 acceptance tier — admin review queue on the REAL pipeline (Phase 1).

A flagged credential (awarded through the real event processor with a fast-answer event)
flows: queue -> detail -> transition (verified/revoked) -> immutable history -> stable
public verify URL showing current status. Real Postgres, real Redis, real worker paths.
"""

import uuid
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis

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
    await FastAPILimiter.init(real_redis, prefix=f"fastapi-limiter-b3-{uuid.uuid4().hex}")
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac, real_redis
    finally:
        await FastAPILimiter.close()
        app.dependency_overrides.clear()
        await real_redis.close()


async def _flagged_credential(db_session: AsyncSession, user_id: uuid.UUID) -> uuid.UUID:
    """Award one credential through the real processor with a flagged (fast-answer) event."""
    event = AssessmentSubmittedEvent(
        user_id=user_id,
        org_id=None,
        idempotency_key=f"b3-flag:{uuid.uuid4()}",
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
                "time_spent_ms": 100,  # suspiciously fast -> integrity gate flags the event
            }
            for _ in range(10)
        ],
    )
    await GamificationEventProcessor(db_session).process(event)
    await db_session.commit()
    credentials = await CredentialRepository(db_session).list_for_user(user_id)
    assert len(credentials) == 1
    assert credentials[0].status == "flagged"
    return credentials[0].id


async def _promote_to_admin(
    db_session: AsyncSession, user_id: str, *, role: Role, org_id: uuid.UUID | None = None
) -> None:
    await db_session.execute(
        update(User).where(User.id == user_id).values(role=role.value, org_id=org_id)
    )
    await db_session.commit()


# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_review_queue_detail_and_clear_transition(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    client, _redis = real_redis_client
    reviewer = await register_and_login(client, "b3-reviewer@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {reviewer}"})
    reviewer_id = me.json()["id"]
    await _promote_to_admin(db_session, reviewer_id, role=Role.PLATFORM_OPS)

    learner_token = await register_and_login(client, "b3-learner@example.com")
    me_learner = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {learner_token}"}
    )
    learner_id = me_learner.json()["id"]
    credential_id = await _flagged_credential(db_session, uuid.UUID(learner_id))

    admin_headers = {"Authorization": f"Bearer {reviewer}"}

    # Queue lists the flagged credential.
    queue = await client.get("/api/v1/admin/reviews/credentials", headers=admin_headers)
    assert queue.status_code == 200
    items = queue.json()
    assert any(item["id"] == str(credential_id) for item in items)

    # Detail exposes the credential + empty history.
    detail = await client.get(
        f"/api/v1/admin/reviews/credentials/{credential_id}", headers=admin_headers
    )
    assert detail.status_code == 200
    body = detail.json()
    assert body["status"] == "flagged"
    assert body["history"] == []

    # Clear: flagged -> verified. History is recorded.
    transition = await client.post(
        f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
        json={"to_status": "verified", "reason": "Answered within the 60s window"},
        headers=admin_headers,
    )
    assert transition.status_code == 200
    assert transition.json()["status"] == "verified"
    history = transition.json()["history"]
    assert len(history) == 1
    assert history[0]["previous_status"] == "flagged"
    assert history[0]["new_status"] == "verified"
    assert history[0]["reviewer_id"] == reviewer_id

    # Queue no longer lists it as flagged.
    queue_after = await client.get(
        "/api/v1/admin/reviews/credentials", headers=admin_headers
    )
    assert all(item["id"] != str(credential_id) for item in queue_after.json())


@pytest.mark.asyncio
async def test_revocation_keeps_stable_public_verify_url(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    client, _redis = real_redis_client
    reviewer = await register_and_login(client, "b3-revoker@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {reviewer}"})
    await _promote_to_admin(db_session, me.json()["id"], role=Role.PLATFORM_OPS)

    learner_token = await register_and_login(client, "b3-revoked-learner@example.com")
    me_learner = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {learner_token}"}
    )
    learner_id = me_learner.json()["id"]
    credential_id = await _flagged_credential(db_session, uuid.UUID(learner_id))
    credentials = await CredentialRepository(db_session).list_for_user(uuid.UUID(learner_id))
    public_id = credentials[0].public_id

    admin_headers = {"Authorization": f"Bearer {reviewer}"}

    # Public verify shows flagged BEFORE the review decision.
    before = await client.get(f"/api/v1/verify/{public_id}")
    assert before.status_code == 200
    assert before.json()["status"] == "flagged"

    # Revoke: flagged -> revoked.
    transition = await client.post(
        f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
        json={"to_status": "revoked", "reason": "Timing anomalies confirmed"},
        headers=admin_headers,
    )
    assert transition.status_code == 200
    assert transition.json()["status"] == "revoked"

    # Public verify URL is STABLE and reports revoked (never 404 for a valid credential).
    after = await client.get(f"/api/v1/verify/{public_id}")
    assert after.status_code == 200
    assert after.json()["status"] == "revoked"
    assert "Revoked" in after.json()["note"]


@pytest.mark.asyncio
async def test_invalid_and_stale_transitions_fail(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    client, _redis = real_redis_client
    reviewer = await register_and_login(client, "b3-guard@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {reviewer}"})
    await _promote_to_admin(db_session, me.json()["id"], role=Role.PLATFORM_OPS)

    learner_token = await register_and_login(client, "b3-guard-learner@example.com")
    me_learner = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {learner_token}"}
    )
    credential_id = await _flagged_credential(
        db_session, uuid.UUID(me_learner.json()["id"])
    )
    admin_headers = {"Authorization": f"Bearer {reviewer}"}

    # Unknown credential -> 404.
    unknown = await client.post(
        f"/api/v1/admin/reviews/credentials/{uuid.uuid4()}/transition",
        json={"to_status": "verified"},
        headers=admin_headers,
    )
    assert unknown.status_code == 404

    # Valid first transition.
    first = await client.post(
        f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
        json={"to_status": "verified"},
        headers=admin_headers,
    )
    assert first.status_code == 200

    # Same transition again -> stale (409): the credential is no longer flagged.
    again = await client.post(
        f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
        json={"to_status": "verified"},
        headers=admin_headers,
    )
    assert again.status_code == 409

    # A later reversal (verified -> revoked) is a valid §7.3 transition…
    revoked = await client.post(
        f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
        json={"to_status": "revoked"},
        headers=admin_headers,
    )
    assert revoked.status_code == 200

    # …but revoked is terminal — no transition out of it exists.
    revive = await client.post(
        f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
        json={"to_status": "verified"},
        headers=admin_headers,
    )
    assert revive.status_code == 409


@pytest.mark.asyncio
async def test_verified_can_be_revoked_later_and_history_is_append_only(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    """gamification §7.3: a credential whose underlying entries are reversed later flips to
    revoked at the same stable URL — verified -> revoked is an allowed transition, and every
    decision is an immutable history row (never deleted, never overwritten)."""
    client, _redis = real_redis_client
    reviewer = await register_and_login(client, "b3-late-revoker@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {reviewer}"})
    await _promote_to_admin(db_session, me.json()["id"], role=Role.PLATFORM_OPS)

    learner_token = await register_and_login(client, "b3-late-learner@example.com")
    me_learner = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {learner_token}"}
    )
    credential_id = await _flagged_credential(
        db_session, uuid.UUID(me_learner.json()["id"])
    )
    admin_headers = {"Authorization": f"Bearer {reviewer}"}

    # Clear first.
    cleared = await client.post(
        f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
        json={"to_status": "verified"},
        headers=admin_headers,
    )
    assert cleared.status_code == 200

    # Later reversal: verified -> revoked.
    revoked = await client.post(
        f"/api/v1/admin/reviews/credentials/{credential_id}/transition",
        json={"to_status": "revoked", "reason": "Post-clear ledger reversal"},
        headers=admin_headers,
    )
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"
    history = revoked.json()["history"]
    assert [h["new_status"] for h in history] == ["verified", "revoked"]
    assert [h["previous_status"] for h in history] == ["flagged", "verified"]

    # History is immutable and complete on detail (both rows, oldest first).
    detail = await client.get(
        f"/api/v1/admin/reviews/credentials/{credential_id}", headers=admin_headers
    )
    assert detail.status_code == 200
    assert len(detail.json()["history"]) == 2


@pytest.mark.asyncio
async def test_public_verify_is_rate_limited(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
) -> None:
    """B3 required fix 1: GET /verify/{id} carries the same public rate limit as the other
    public reads — normal requests pass, an excessive burst is limited."""
    client, _redis = real_redis_client
    learner_token = await register_and_login(client, "b3-rate-learner@example.com")
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {learner_token}"}
    )
    await _flagged_credential(db_session, uuid.UUID(me.json()["id"]))

    credentials = await CredentialRepository(db_session).list_for_user(uuid.UUID(me.json()["id"]))
    public_id = credentials[0].public_id

    # Normal requests are allowed.
    first = await client.get(f"/api/v1/verify/{public_id}")
    assert first.status_code == 200

    # Exceeding PUBLIC_RATE_LIMIT (60/60s) on the same route+key returns 429.
    limited: int | None = None
    for _ in range(70):
        response = await client.get(f"/api/v1/verify/{public_id}")
        if response.status_code == 429:
            limited = response.status_code
            break
    assert limited == 429
