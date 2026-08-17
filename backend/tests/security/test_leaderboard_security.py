"""Slice 06 §20 — leaderboard security.

The leaderboard is a server-owned projection: the client can never inject entries, spoof a
score/rank/org, or mutate Redis keys; identity comes from the token; the frozen policy is
enforced server-side; and no private fields are leaked.
"""

import uuid

import fakeredis
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.context.schema import ProgressContext, RankState, StreakState
from gamification.projections.leaderboard import LeaderboardProjection
from tests.conftest import register_and_login


def _context(
    user_id: uuid.UUID,
    *,
    completion_xp: int = 0,
    mastery_xp: int = 0,
    frozen: bool = False,
) -> ProgressContext:
    streak = StreakState(
        user_id=user_id,
        current_streak_days=1,
        longest_streak_days=1,
        freeze_tokens_available=0,
        momentum_multiplier=1.0,
        last_active_date="2026-01-01",
        status="active",
    )
    rank = RankState(
        user_id=user_id,
        level=1,
        rank_name="Initiate",
        prestige_tier=0,
        completion_xp=completion_xp,
        mastery_xp=mastery_xp,
        rank_progress_pct=0.0,
        percentile_global=0.0,
        percentile_cohort=None,
        specialization_tag=None,
    )
    return ProgressContext(
        context_version=1,
        user_id=user_id,
        computed_at="2026-01-01T00:00:00+00:00",
        rank=rank,
        streak=streak,
        league=None,
        guild=None,
        unresolved_flags=["integrity_review_pending"] if frozen else [],
        freeze_status="frozen_pending_review" if frozen else "live",
    )


@pytest.mark.asyncio
async def test_client_cannot_spoof_org_or_score_via_query_params(
    client: AsyncClient, db_session: AsyncSession, redis: fakeredis.FakeAsyncRedis
) -> None:
    """org_id, user_id, and score query params are ignored — the board is server-derived."""
    await LeaderboardProjection(redis).update_user(
        _context(uuid.uuid4(), mastery_xp=500), display_name="Alice"
    )

    clean = (await client.get("/api/v1/leaderboards/global")).json()
    spoofed = await client.get(
        "/api/v1/leaderboards/global",
        params={
            "org_id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "score": "999999",
            "rank": "1",
        },
    )

    assert spoofed.status_code == 200
    assert spoofed.json() == clean


@pytest.mark.asyncio
async def test_client_cannot_inject_leaderboard_entries(
    client: AsyncClient, redis: fakeredis.FakeAsyncRedis
) -> None:
    """There is no write endpoint — POST/PUT/DELETE are not routed. The projection only changes
    through the authoritative event pipeline, never the browser."""
    for method in ("post", "put", "patch", "delete"):
        response = await getattr(client, method)("/api/v1/leaderboards/global")
        assert response.status_code == 405  # method not allowed

    assert await redis.zcard("leaderboard:global") == 0


@pytest.mark.asyncio
async def test_user_cannot_read_another_users_position(
    client: AsyncClient, db_session: AsyncSession, redis: fakeredis.FakeAsyncRedis
) -> None:
    """`/me` always answers for the token's user — passing another user's id changes nothing."""
    token_a = await register_and_login(client, "lb-sec-a@example.com")
    token_b = await register_and_login(client, "lb-sec-b@example.com")
    me_a = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    me_b = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_b}"})
    user_a = me_a.json()["id"]
    user_b = me_b.json()["id"]
    await LeaderboardProjection(redis).update_user(
        _context(uuid.UUID(user_a), mastery_xp=500), display_name="A"
    )
    await LeaderboardProjection(redis).update_user(
        _context(uuid.UUID(user_b), mastery_xp=300), display_name="B"
    )

    headers_a = {"Authorization": f"Bearer {token_a}"}
    response = await client.get(
        "/api/v1/leaderboards/global/me", headers=headers_a, params={"user_id": user_b}
    )

    assert response.json()["user_id"] == user_a
    assert response.json()["score"] == 300.0  # 0.6 * 500


@pytest.mark.asyncio
async def test_frozen_user_not_visible_to_other_users(
    client: AsyncClient, db_session: AsyncSession, redis: fakeredis.FakeAsyncRedis
) -> None:
    """The frozen policy is server-side — no other user can see a frozen user on the board."""
    token = await register_and_login(client, "lb-sec-viewer@example.com")
    await LeaderboardProjection(redis).update_user(
        _context(uuid.uuid4(), mastery_xp=500, frozen=True), display_name="Frozen"
    )

    board = await client.get(
        "/api/v1/leaderboards/global", headers={"Authorization": f"Bearer {token}"}
    )

    assert board.status_code == 200
    assert board.json()["total"] == 0


@pytest.mark.asyncio
async def test_tenant_isolation_on_the_global_board(
    client: AsyncClient, db_session: AsyncSession, redis: fakeredis.FakeAsyncRedis
) -> None:
    """The global board is a cross-org community board by design; the security property is that
    there is NO org-scoped read and NO client-supplied org context. Users in different orgs see
    the same authoritative board, and org_id is never accepted."""
    token_a = await register_and_login(client, "lb-org-a@example.com")
    token_b = await register_and_login(client, "lb-org-b@example.com")

    from sqlalchemy import update

    from platform_core.core.models.user import User

    me_a = (await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token_a}"}
    )).json()["id"]
    me_b = (await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token_b}"}
    )).json()["id"]
    await db_session.execute(
        update(User).where(User.id == me_a).values(org_id=uuid.uuid4())
    )
    await db_session.execute(
        update(User).where(User.id == me_b).values(org_id=uuid.uuid4())
    )
    await db_session.commit()

    await LeaderboardProjection(redis).update_user(
        _context(uuid.UUID(me_a), mastery_xp=500), display_name="A"
    )

    board_a = (
        await client.get(
            "/api/v1/leaderboards/global",
            headers={"Authorization": f"Bearer {token_a}"},
        )
    ).json()
    board_b = (
        await client.get(
            "/api/v1/leaderboards/global",
            headers={"Authorization": f"Bearer {token_b}"},
            params={"org_id": str(uuid.uuid4())},
        )
    ).json()

    # The board content (entries, scores, ordering) is identical across orgs — only `is_me`
    # legitimately differs because the viewers are different users.
    def _strip_viewer(board: dict[str, object]) -> dict[str, object]:
        raw = board.get("entries", [])
        raw_entries = raw if isinstance(raw, list) else []
        entry_dicts = [e for e in raw_entries if isinstance(e, dict)]
        entries = [
            {k: v for k, v in e.items() if k != "is_me"} for e in entry_dicts
        ]
        return {k: v for k, v in board.items() if k != "entries"} | {"entries": entries}

    assert _strip_viewer(board_a) == _strip_viewer(board_b)
    assert board_a["total"] == 1
    a_entries = board_a.get("entries", [])
    b_entries = board_b.get("entries", [])
    assert a_entries and isinstance(a_entries[0], dict)
    assert b_entries and isinstance(b_entries[0], dict)
    assert a_entries[0]["is_me"] is True
    assert b_entries[0]["is_me"] is False
    # No org-scoped endpoint exists — `org/{id}` matches no route (404, no leak), and the
    # known non-global scope `guild` is a typed 501 stub, never a data leak.
    org_scope = await client.get(
        f"/api/v1/leaderboards/org/{uuid.uuid4()}", headers={"Authorization": f"Bearer {token_a}"}
    )
    assert org_scope.status_code == 404
    guild_scope = await client.get(
        "/api/v1/leaderboards/guild", headers={"Authorization": f"Bearer {token_a}"}
    )
    assert guild_scope.status_code == 501


@pytest.mark.asyncio
async def test_pagination_limits_are_enforced(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/leaderboards/global?limit=101")).status_code == 422
    assert (await client.get("/api/v1/leaderboards/global?limit=0")).status_code == 422
    assert (await client.get("/api/v1/leaderboards/global?offset=-5")).status_code == 422


@pytest.mark.asyncio
async def test_projection_cannot_be_mutated_by_the_frontend(
    client: AsyncClient, redis: fakeredis.FakeAsyncRedis
) -> None:
    """Redis keys are server-owned: the API exposes only read endpoints, and the projection
    changes exclusively via the event pipeline — nothing the client sends can write it.
    """
    before = await redis.zcard("leaderboard:global")
    await client.post(
        "/api/v1/leaderboards/global",
        json={"user_id": str(uuid.uuid4()), "score": 999},
    )
    assert await redis.zcard("leaderboard:global") == before
