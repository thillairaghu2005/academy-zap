"""Slice 06 — leaderboard projection + read API.

The projection is a Redis sorted-set read model over authoritative `ProgressContext`; the XP
ledger remains the source of truth. These tests verify: deterministic scoring/ordering,
tie-breaking, frozen-user exclusion, pagination, my-position, rebuild consistency, tenant
isolation, and the client-can't-spoof guarantees. HTTP tier uses real throwaway Postgres +
fakeredis (auth only); the real-pipeline acceptance lives in test_leaderboard_acceptance.py.
"""

import uuid

import fakeredis
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.context.rank import weighted_rank_score
from gamification.context.schema import ProgressContext, RankState, StreakState
from gamification.projections.leaderboard import LeaderboardProjection, leaderboard_score
from tests.conftest import register_and_login


def _context(
    user_id: uuid.UUID,
    *,
    completion_xp: int = 0,
    mastery_xp: int = 0,
    frozen: bool = False,
    display_name: str = "Learner",
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


@pytest.fixture
def projection(redis: fakeredis.FakeAsyncRedis) -> LeaderboardProjection:
    return LeaderboardProjection(redis)


# ---------------------------------------------------------------------------
# Scoring semantics
# ---------------------------------------------------------------------------


def test_leaderboard_score_is_the_weighted_rank_value() -> None:
    """The board orders by the exact value `resolve_rank` consumes — order agrees with ranks."""
    assert leaderboard_score(completion_xp=400, mastery_xp=0) == weighted_rank_score(
        completion_xp=400, mastery_xp=0
    )
    assert leaderboard_score(completion_xp=0, mastery_xp=500) == weighted_rank_score(
        completion_xp=0, mastery_xp=500
    )
    assert leaderboard_score(completion_xp=400, mastery_xp=300) == weighted_rank_score(
        completion_xp=400, mastery_xp=300
    )


@pytest.mark.asyncio
async def test_update_user_is_idempotent(projection: LeaderboardProjection) -> None:
    user_id = uuid.uuid4()
    ctx = _context(user_id, mastery_xp=500)

    await projection.update_user(ctx, display_name="Alice")
    await projection.update_user(ctx, display_name="Alice")
    page = await projection.page(offset=0, limit=10)

    assert page["total"] == 1
    assert page["entries"][0]["user_id"] == str(user_id)
    assert page["entries"][0]["score"] == leaderboard_score(completion_xp=0, mastery_xp=500)


@pytest.mark.asyncio
async def test_ordering_is_score_descending(projection: LeaderboardProjection) -> None:
    low = _context(uuid.uuid4(), completion_xp=400)  # 0.4*400 = 160
    mid = _context(uuid.uuid4(), mastery_xp=500)  # 0.6*500 = 300
    high = _context(uuid.uuid4(), completion_xp=400, mastery_xp=900)  # 160 + 540 = 700

    await projection.update_user(low, display_name="Low")
    await projection.update_user(high, display_name="High")
    await projection.update_user(mid, display_name="Mid")
    page = await projection.page(offset=0, limit=10)

    scores = [e["score"] for e in page["entries"]]
    assert scores == sorted(scores, reverse=True)
    assert [e["display_name"] for e in page["entries"]] == ["High", "Mid", "Low"]


@pytest.mark.asyncio
async def test_tie_break_is_deterministic(projection: LeaderboardProjection) -> None:
    """Equal scores order deterministically (Redis member ordering — descending for
    ZREVRANGE) — stable across re-reads, never random/db-insertion order."""
    a = _context(uuid.UUID("00000000-0000-4000-8000-00000000000a"), mastery_xp=500)
    b = _context(uuid.UUID("00000000-0000-4000-8000-00000000000b"), mastery_xp=500)
    c = _context(uuid.UUID("00000000-0000-4000-8000-00000000000c"), mastery_xp=500)

    for ctx in (c, a, b):  # insert in scrambled order
        await projection.update_user(ctx, display_name=str(ctx.user_id))

    first = await projection.page(offset=0, limit=10)
    second = await projection.page(offset=0, limit=10)
    ids = [e["user_id"] for e in first["entries"]]
    assert ids == sorted(ids, reverse=True)  # ZREVRANGE member order: descending
    assert [e["user_id"] for e in second["entries"]] == ids  # stable across reads


@pytest.mark.asyncio
async def test_frozen_user_is_excluded_but_score_still_accrues(
    projection: LeaderboardProjection,
) -> None:
    live = _context(uuid.uuid4(), mastery_xp=500, display_name="Live")
    frozen = _context(uuid.uuid4(), mastery_xp=900, frozen=True, display_name="Frozen")

    await projection.update_user(live, display_name="Live")
    await projection.update_user(frozen, display_name="Frozen")
    page = await projection.page(offset=0, limit=10)

    assert page["total"] == 1
    assert page["entries"][0]["user_id"] == str(live.user_id)

    # Unfreeze -> re-added on the next projection update.
    await projection.update_user(
        _context(frozen.user_id, mastery_xp=900, display_name="Frozen"), display_name="Frozen"
    )
    assert (await projection.page(offset=0, limit=10))["total"] == 2


# ---------------------------------------------------------------------------
# Pagination + my position
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pagination_returns_slices_and_has_more(projection: LeaderboardProjection) -> None:
    for i in range(25):
        await projection.update_user(_context(uuid.uuid4(), completion_xp=i), display_name=f"U{i}")

    first = await projection.page(offset=0, limit=10)
    second = await projection.page(offset=10, limit=10)
    third = await projection.page(offset=20, limit=10)

    assert first["total"] == 25
    assert first["has_more"] is True
    assert second["has_more"] is True
    assert third["has_more"] is False
    assert len(first["entries"]) == 10
    assert len(second["entries"]) == 10
    assert len(third["entries"]) == 5
    # dense 1-based ranks across pages
    assert first["entries"][0]["rank"] == 1
    assert second["entries"][0]["rank"] == 11
    assert third["entries"][0]["rank"] == 21


@pytest.mark.asyncio
async def test_page_beyond_end_is_empty(projection: LeaderboardProjection) -> None:
    await projection.update_user(_context(uuid.uuid4(), completion_xp=100), display_name="U")
    page = await projection.page(offset=50, limit=10)
    assert page["total"] == 1
    assert page["entries"] == []
    assert page["has_more"] is False


@pytest.mark.asyncio
async def test_my_position_via_zrevrank(projection: LeaderboardProjection) -> None:
    me = _context(uuid.uuid4(), mastery_xp=500, display_name="Me")
    higher = _context(uuid.uuid4(), completion_xp=400, mastery_xp=400)
    lower = _context(uuid.uuid4(), completion_xp=100)
    for ctx in (me, higher, lower):
        await projection.update_user(ctx, display_name=str(ctx.user_id))

    entry = await projection.my_position(str(me.user_id))
    assert entry is not None
    assert entry["rank"] == 2  # one user above
    assert entry["is_me"] is True
    assert entry["user_id"] == str(me.user_id)
    assert entry["score"] == leaderboard_score(completion_xp=0, mastery_xp=500)


@pytest.mark.asyncio
async def test_my_position_null_when_not_ranked(projection: LeaderboardProjection) -> None:
    assert await projection.my_position(str(uuid.uuid4())) is None


@pytest.mark.asyncio
async def test_is_me_only_for_the_viewer(projection: LeaderboardProjection) -> None:
    a = _context(uuid.uuid4(), completion_xp=400, display_name="A")
    b = _context(uuid.uuid4(), completion_xp=200, display_name="B")
    await projection.update_user(a, display_name="A")
    await projection.update_user(b, display_name="B")

    page = await projection.page(offset=0, limit=10, viewer_user_id=str(a.user_id))
    me_flags = {e["user_id"]: e["is_me"] for e in page["entries"]}
    assert me_flags[str(a.user_id)] is True
    assert me_flags[str(b.user_id)] is False


# ---------------------------------------------------------------------------
# Rebuild
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rebuild_matches_incremental_updates(projection: LeaderboardProjection) -> None:
    users = [uuid.uuid4() for _ in range(6)]
    contexts = {
        u: _context(u, completion_xp=i * 100, mastery_xp=(5 - i) * 100) for i, u in enumerate(users)
    }
    contexts[users[-1]] = _context(users[-1], mastery_xp=999, frozen=True)

    incremental = LeaderboardProjection(projection._redis)
    for ctx in contexts.values():
        await incremental.update_user(ctx, display_name=str(ctx.user_id))

    rebuilt = LeaderboardProjection(projection._redis)
    count = await rebuilt.rebuild(list(contexts.values()), {str(u): str(u) for u in users})

    assert count == 5  # frozen excluded
    inc_page = await incremental.page(offset=0, limit=100)
    reb_page = await rebuilt.page(offset=0, limit=100)
    assert reb_page["total"] == inc_page["total"]
    assert reb_page["entries"] == inc_page["entries"]


# ---------------------------------------------------------------------------
# HTTP tier — read API
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_board_is_publicly_readable(
    client: AsyncClient, redis: fakeredis.FakeAsyncRedis
) -> None:
    projection = LeaderboardProjection(redis)
    await projection.update_user(_context(uuid.uuid4(), mastery_xp=500), display_name="Alice")

    response = await client.get("/api/v1/leaderboards/global")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["entries"][0]["display_name"] == "Alice"
    assert body["entries"][0]["is_me"] is False


@pytest.mark.asyncio
async def test_board_never_leaks_private_fields(
    client: AsyncClient, redis: fakeredis.FakeAsyncRedis
) -> None:
    await LeaderboardProjection(redis).update_user(
        _context(uuid.uuid4(), mastery_xp=500), display_name="Alice"
    )

    body = (await client.get("/api/v1/leaderboards/global")).json()
    entry = body["entries"][0]

    assert "email" not in entry
    assert "hashed_password" not in entry
    assert "org_id" not in entry
    assert "id" not in entry  # internal uuid exposed as user_id only


@pytest.mark.asyncio
async def test_my_position_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/leaderboards/global/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_my_position_returns_server_derived_identity(
    client: AsyncClient, db_session: AsyncSession, redis: fakeredis.FakeAsyncRedis
) -> None:
    token = await register_and_login(client, "lb-me@example.com")
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    me_id = uuid.UUID(me.json()["id"])
    await LeaderboardProjection(redis).update_user(
        _context(me_id, mastery_xp=500), display_name="Me"
    )

    response = await client.get(
        "/api/v1/leaderboards/global/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == str(me_id)
    assert body["rank"] == 1
    assert body["is_me"] is True


@pytest.mark.asyncio
async def test_client_cannot_spoof_position_via_query_params(
    client: AsyncClient, db_session: AsyncSession, redis: fakeredis.FakeAsyncRedis
) -> None:
    token = await register_and_login(client, "lb-spoof@example.com")
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    me_id = uuid.UUID(me.json()["id"])
    other = uuid.uuid4()
    await LeaderboardProjection(redis).update_user(
        _context(me_id, mastery_xp=500), display_name="Me"
    )
    await LeaderboardProjection(redis).update_user(
        _context(other, mastery_xp=900), display_name="Other"
    )

    headers = {"Authorization": f"Bearer {token}"}
    spoofed = await client.get(
        "/api/v1/leaderboards/global/me", headers=headers, params={"user_id": str(other)}
    )
    assert spoofed.status_code == 200
    assert spoofed.json()["user_id"] == str(me_id)  # identity always from the token


@pytest.mark.asyncio
async def test_guild_scope_is_a_typed_501(client: AsyncClient) -> None:
    response = await client.get("/api/v1/leaderboards/guild")
    assert response.status_code == 501
    assert response.json()["subsystem"] == "guild/org leaderboards"


@pytest.mark.asyncio
async def test_pagination_validation(client: AsyncClient) -> None:
    too_small = await client.get("/api/v1/leaderboards/global?limit=0")
    too_large = await client.get("/api/v1/leaderboards/global?limit=101")
    negative_offset = await client.get("/api/v1/leaderboards/global?offset=-1")
    assert too_small.status_code == 422
    assert too_large.status_code == 422
    assert negative_offset.status_code == 422
