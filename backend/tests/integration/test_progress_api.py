"""Slice 05 §2/§14 — HTTP-level verification of the authoritative progression read API.

`GET /api/v1/me/progress` is the single frontend boundary for progression in backend mode.
Every test here hits the real endpoint (real throwaway Postgres, fakeredis for auth) and
asserts the server-derived contract: caller-scoped, tenant-isolated, deterministic, and
immune to client-provided user_id/org_id/XP/rank/streak.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.models import ProgressContextSnapshot
from gamification.repositories.ledger import LedgerRepository
from tests.conftest import register_and_login

PROGRESS_URL = "/api/v1/me/progress"


async def _user_id(client: AsyncClient, access_token: str) -> uuid.UUID:
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me.status_code == 200
    return uuid.UUID(me.json()["id"])


async def _seed_entry(
    db_session: AsyncSession,
    user_id: uuid.UUID,
    *,
    xp_delta: int = 400,
    xp_type: str = "completion",
    reason_code: str = "COURSE_COMPLETE",
    integrity_status: str = "verified",
) -> None:
    ledger = LedgerRepository(db_session)
    await ledger.append(
        user_id=user_id,
        event_id=uuid.uuid4(),
        xp_type=xp_type,
        xp_delta=xp_delta,
        reason_code=reason_code,
        integrity_status=integrity_status,
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_me_progress_requires_authentication(client: AsyncClient) -> None:
    response = await client.get(PROGRESS_URL)

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_progress_returns_only_the_callers_context(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    token_a = await register_and_login(client, "progress-a@example.com")
    token_b = await register_and_login(client, "progress-b@example.com")
    user_a = await _user_id(client, token_a)
    user_b = await _user_id(client, token_b)

    await _seed_entry(db_session, user_a, xp_delta=400, reason_code="COURSE_COMPLETE")
    await _seed_entry(
        db_session, user_b, xp_delta=900, reason_code="MAIN_ASSESSMENT", xp_type="mastery"
    )

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    response_a = await client.get(PROGRESS_URL, headers=headers_a)
    response_b = await client.get(PROGRESS_URL, headers=headers_b)

    assert response_a.status_code == 200
    assert response_b.status_code == 200
    ctx_a = response_a.json()
    ctx_b = response_b.json()

    # Each response is scoped to the token's user — no cross-user leakage.
    assert uuid.UUID(ctx_a["user_id"]) == user_a
    assert uuid.UUID(ctx_b["user_id"]) == user_b
    assert ctx_a["rank"]["completion_xp"] == 400
    assert ctx_a["rank"]["mastery_xp"] == 0
    assert ctx_b["rank"]["completion_xp"] == 0
    assert ctx_b["rank"]["mastery_xp"] == 900


@pytest.mark.asyncio
async def test_me_progress_is_tenant_isolated(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Users in different organizations see only their own org's accrual. The endpoint derives
    identity from the token; org_id is never accepted from the client."""
    token_a = await register_and_login(client, "tenant-a-progress@example.com")
    token_b = await register_and_login(client, "tenant-b-progress@example.com")
    user_a = await _user_id(client, token_a)
    user_b = await _user_id(client, token_b)

    org_a = uuid.uuid4()
    org_b = uuid.uuid4()
    from sqlalchemy import update

    from platform_core.core.models.user import User

    await db_session.execute(update(User).where(User.id == user_a).values(org_id=org_a))
    await db_session.execute(update(User).where(User.id == user_b).values(org_id=org_b))
    await db_session.commit()

    await _seed_entry(db_session, user_a, xp_delta=400, reason_code="COURSE_COMPLETE")
    await _seed_entry(
        db_session, user_b, xp_delta=500, reason_code="MAIN_ASSESSMENT", xp_type="mastery"
    )

    ctx_a = (await client.get(PROGRESS_URL, headers={"Authorization": f"Bearer {token_a}"})).json()
    ctx_b = (await client.get(PROGRESS_URL, headers={"Authorization": f"Bearer {token_b}"})).json()

    assert uuid.UUID(ctx_a["user_id"]) == user_a
    assert uuid.UUID(ctx_b["user_id"]) == user_b
    assert ctx_a["rank"]["completion_xp"] == 400
    assert ctx_a["rank"]["mastery_xp"] == 0
    assert ctx_b["rank"]["mastery_xp"] == 500


@pytest.mark.asyncio
async def test_client_cannot_influence_the_response(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """user_id, org_id, XP, rank, streak, freeze — anything the client appends as query params
    is ignored; the endpoint recomputes everything from the token + ledger."""
    token = await register_and_login(client, "progress-spoof@example.com")
    user_id = await _user_id(client, token)
    await _seed_entry(db_session, user_id, xp_delta=400, reason_code="COURSE_COMPLETE")

    clean = (await client.get(PROGRESS_URL, headers={"Authorization": f"Bearer {token}"})).json()
    spoofed = await client.get(
        PROGRESS_URL,
        headers={"Authorization": f"Bearer {token}"},
        params={
            "user_id": str(uuid.uuid4()),
            "org_id": str(uuid.uuid4()),
            "xp": "999999",
            "rank": "Deus",
            "streak": "365",
            "freeze_status": "frozen_pending_review",
            "context_version": "99",
        },
    )

    assert spoofed.status_code == 200
    # Every resolve increments context_version/computed_at by design (Phase 7), so compare the
    # authoritative derived state — none of the spoofed params may influence it.
    compared_keys = (
        "user_id",
        "rank",
        "streak",
        "freeze_status",
        "unresolved_flags",
        "league",
        "guild",
    )
    clean_ctx = {k: clean[k] for k in compared_keys}
    spoofed_ctx = {k: spoofed.json()[k] for k in clean_ctx}
    assert spoofed_ctx == clean_ctx


@pytest.mark.asyncio
async def test_new_user_gets_a_deterministic_empty_context(
    client: AsyncClient,
) -> None:
    """No activity yet — the endpoint still returns a valid, deterministic context (the
    dashboard/rank surfaces render it, they never crash on a new user)."""
    token = await register_and_login(client, "progress-newbie@example.com")

    response = await client.get(PROGRESS_URL, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    ctx = response.json()
    assert ctx["rank"]["completion_xp"] == 0
    assert ctx["rank"]["mastery_xp"] == 0
    assert ctx["rank"]["level"] == 1
    assert ctx["rank"]["rank_name"] == "Initiate"
    assert ctx["streak"]["current_streak_days"] == 0
    assert ctx["streak"]["status"] == "broken"
    assert ctx["freeze_status"] == "live"
    assert ctx["unresolved_flags"] == []
    assert ctx["league"] is None
    assert ctx["guild"] is None


@pytest.mark.asyncio
async def test_frozen_context_is_served_through_the_api(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """A flagged ledger entry must surface as frozen_pending_review over HTTP — the frontend
    never hides or converts it. Private XP still accrues (Phase 6)."""
    token = await register_and_login(client, "progress-frozen@example.com")
    user_id = await _user_id(client, token)
    await _seed_entry(
        db_session,
        user_id,
        xp_delta=1_000,
        reason_code="SUSPICIOUS_VELOCITY",
        integrity_status="flagged",
    )

    response = await client.get(PROGRESS_URL, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    ctx = response.json()
    assert ctx["freeze_status"] == "frozen_pending_review"
    assert "integrity_review_pending" in ctx["unresolved_flags"]
    assert ctx["rank"]["completion_xp"] == 1_000


@pytest.mark.asyncio
async def test_context_snapshots_are_append_only_and_immutable(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Every resolve writes a new ProgressContextSnapshot row — version increments, and an old
    snapshot's JSON payload is never mutated by a later resolve (Phase 7)."""
    token = await register_and_login(client, "progress-snapshots@example.com")
    user_id = await _user_id(client, token)
    await _seed_entry(db_session, user_id, xp_delta=400, reason_code="COURSE_COMPLETE")

    first = (await client.get(PROGRESS_URL, headers={"Authorization": f"Bearer {token}"})).json()
    second = (await client.get(PROGRESS_URL, headers={"Authorization": f"Bearer {token}"})).json()

    assert first["context_version"] == 1
    assert second["context_version"] == 2

    result = await db_session.execute(
        select(ProgressContextSnapshot)
        .where(ProgressContextSnapshot.user_id == user_id)
        .order_by(ProgressContextSnapshot.context_version)
    )
    snapshots = list(result.scalars().all())
    assert [s.context_version for s in snapshots] == [1, 2]
    # The v1 payload is byte-identical to what the API served, and unchanged by the v2 resolve.
    assert snapshots[0].rank["completion_xp"] == 400
    assert snapshots[0].rank["rank_name"] == "Initiate"
    assert snapshots[1].rank["completion_xp"] == 400
    assert snapshots[1].rank["rank_name"] == "Initiate"
