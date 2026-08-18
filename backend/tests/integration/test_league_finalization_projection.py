"""Slice 09 remediation — FIX-2: Redis tier projections are refreshed AFTER season
finalization, and only ever reflect committed PostgreSQL state.

Real Postgres + real Redis: the admin finalize endpoint commits the promotion/demotion
outcomes to PostgreSQL, then rebuilds EVERY tier's league ZSET from the committed
membership rows. A promoted user must leave the old tier's ZSET and appear in the new
tier's ZSET; a demoted user must move the other way; a rebuild produces identical
results; and a Redis outage during finalization never corrupts the DB (the projection
stays rebuildable).
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

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

from gamification.projections.leagues import LeagueProjection
from gamification.repositories.leagues import MembershipRepository, SeasonRepository
from gamification.services.seasons import SeasonService
from platform_core.core.config import settings
from platform_core.core.db.session import get_session
from platform_core.core.models.user import User
from platform_core.core.rbac import Role
from platform_core.core.redis import get_redis
from tests.conftest import register_and_login


@pytest_asyncio.fixture
async def real_redis_client(
    db_session: AsyncSession,
) -> AsyncGenerator[tuple[AsyncClient, AsyncRedis]]:
    """Client with get_session/get_redis overridden to the real Postgres session and REAL
    Redis (same pattern as test_leagues_acceptance.py)."""
    real_redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def _override_get_session() -> AsyncGenerator[AsyncSession]:
        yield db_session

    async def _override_get_redis() -> AsyncGenerator[AsyncRedis]:
        yield real_redis

    from fastapi_limiter import FastAPILimiter

    from main import app

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_redis] = _override_get_redis
    # Clean the shared league keys + event stream so totals are exact.
    keys = [f"league:{key}" for key in await _all_league_keys(real_redis)]
    if keys:
        await real_redis.delete(*keys)
    from platform_core.bus.producer import EVENTS_STREAM_KEY

    await real_redis.delete(EVENTS_STREAM_KEY)
    await FastAPILimiter.init(real_redis, prefix=f"fastapi-limiter-league-fix2-{uuid.uuid4().hex}")
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac, real_redis
    finally:
        await FastAPILimiter.close()
        app.dependency_overrides.clear()
        await real_redis.delete(EVENTS_STREAM_KEY)
        await real_redis.close()


async def _all_league_keys(redis: AsyncRedis) -> list[str]:
    cursor = 0
    keys: list[str] = []
    while True:
        cursor, batch = await redis.scan(cursor, match="league:*", count=100)
        keys.extend(batch)
        if cursor == 0:
            return keys


async def _promote_to_admin(db_session: AsyncSession, user_id: str) -> None:
    await db_session.execute(
        update(User).where(User.id == user_id).values(role=Role.PLATFORM_OPS.value)
    )
    await db_session.commit()


async def _create_active_season(client: AsyncClient, admin_headers: dict[str, str]) -> uuid.UUID:
    start = datetime.now(UTC) - timedelta(hours=1)
    end = datetime.now(UTC) + timedelta(days=7)
    created = await client.post(
        "/api/v1/admin/seasons",
        json={
            "name": f"Finalize Projection {uuid.uuid4().hex[:8]}",
            "start_at": start.isoformat(),
            "end_at": end.isoformat(),
            "config": {"promotion_slots": 1, "demotion_slots": 1},
        },
        headers=admin_headers,
    )
    assert created.status_code == 200
    season_id = uuid.UUID(created.json()["id"])
    activated = await client.post(
        f"/api/v1/admin/seasons/{season_id}/activate", headers=admin_headers
    )
    assert activated.status_code == 200
    return season_id


async def _seed_membership(
    db_session: AsyncSession, season_id: uuid.UUID, *, user_id: uuid.UUID, tier: str, xp: int
) -> None:
    season = await SeasonRepository(db_session).get_by_id(season_id)
    assert season is not None
    membership = await SeasonService(db_session).upsert_membership(
        user_id=user_id, season=season, tier_id=tier
    )
    membership.xp_this_season = xp
    await db_session.flush()


async def _page_user_ids(redis: AsyncRedis, season_id: uuid.UUID, tier: str) -> list[str]:
    page = await LeagueProjection(redis).page(
        season_id=str(season_id), tier_id=tier, offset=0, limit=100
    )
    return [entry["user_id"] for entry in page["entries"]]


# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_finalization_refreshes_tier_zsets_promote_demote_and_rebuild(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
) -> None:
    """After finalization the Redis tier boards reflect the committed PostgreSQL tiers:
    promoted users leave the old ZSET and appear in the new one, demoted users move the
    other way, and a rebuild from PostgreSQL reproduces identical boards."""
    client, real_redis = real_redis_client

    admin_token = await register_and_login(client, "finalize-proj-admin@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    await _promote_to_admin(db_session, me.json()["id"])
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    season_id = await _create_active_season(client, admin_headers)

    # Three users: A in bronze (top -> promoted to silver), B in silver (top -> promoted
    # to gold), C in silver (bottom, demotion_slots=1 -> demoted to bronze).
    user_a, user_b, user_c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    await _seed_membership(db_session, season_id, user_id=user_a, tier="bronze", xp=500)
    await _seed_membership(db_session, season_id, user_id=user_b, tier="silver", xp=800)
    await _seed_membership(db_session, season_id, user_id=user_c, tier="silver", xp=100)
    await db_session.commit()

    # Pre-finalization Redis boards: the worker would have written these incremental rows.
    projection = LeagueProjection(real_redis)
    await projection.update_member(
        season_id=str(season_id),
        tier_id="bronze",
        user_id=str(user_a),
        xp_this_season=500,
        display_name="A",
    )
    await projection.update_member(
        season_id=str(season_id),
        tier_id="silver",
        user_id=str(user_b),
        xp_this_season=800,
        display_name="B",
    )
    await projection.update_member(
        season_id=str(season_id),
        tier_id="silver",
        user_id=str(user_c),
        xp_this_season=100,
        display_name="C",
    )

    # Finalize via the real admin endpoint — it commits, then refreshes Redis.
    finalized = await client.post(
        f"/api/v1/admin/seasons/{season_id}/finalize", headers=admin_headers
    )
    assert finalized.status_code == 200
    outcome = finalized.json()
    assert outcome["already_finalized"] is False
    assert outcome["promoted"] == 2  # A (bronze -> silver) + B (silver -> gold)
    assert outcome["demoted"] == 1  # C (silver -> bronze)

    # PostgreSQL membership tiers are authoritative.
    members = {
        str(m.user_id): m for m in await MembershipRepository(db_session).list_for_season(season_id)
    }
    assert members[str(user_a)].league_tier == "silver"
    assert members[str(user_b)].league_tier == "gold"
    assert members[str(user_c)].league_tier == "bronze"

    # Redis must now reflect committed state — the stale pre-finalization rows are gone.
    assert await _page_user_ids(real_redis, season_id, "bronze") == [str(user_c)]
    assert await _page_user_ids(real_redis, season_id, "silver") == [str(user_a)]
    assert await _page_user_ids(real_redis, season_id, "gold") == [str(user_b)]

    # Rebuilding Redis from PostgreSQL reproduces the identical boards.
    before = {
        tier: await _page_user_ids(real_redis, season_id, tier)
        for tier in ("bronze", "silver", "gold", "platinum", "obsidian")
    }
    await SeasonService(db_session).refresh_league_projection(redis=real_redis, season_id=season_id)
    after = {
        tier: await _page_user_ids(real_redis, season_id, tier)
        for tier in ("bronze", "silver", "gold", "platinum", "obsidian")
    }
    assert after == before
    assert after["bronze"] == [str(user_c)]
    assert after["silver"] == [str(user_a)]
    assert after["gold"] == [str(user_b)]
    assert after["platinum"] == []
    assert after["obsidian"] == []


class _LeagueFailingRedis:
    """Simulates the tier-board projection being unreachable: every command FAILS except
    the `exists` call the auth dependency makes against the JWT denylist, so the request
    is still authenticated while the projection refresh at the end of finalization blows
    up exactly as it would with Redis down."""

    def __init__(self, real: Any) -> None:
        self._real = real

    async def exists(self, *args: Any, **kwargs: Any) -> int:
        return int(await self._real.exists(*args, **kwargs))

    def __getattr__(self, _name: str) -> Any:
        async def _fail(*_args: Any, **_kwargs: Any) -> None:
            raise ConnectionError("redis unavailable (simulated outage)")

        return _fail


@pytest.mark.asyncio
async def test_finalization_succeeds_and_db_stays_authoritative_when_redis_is_down(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
) -> None:
    """A Redis outage during finalization must NOT fail or corrupt the authoritative
    PostgreSQL state — the projection refresh is best-effort and rebuildable later."""
    client, real_redis = real_redis_client

    admin_token = await register_and_login(client, "finalize-redis-down-admin@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    await _promote_to_admin(db_session, me.json()["id"])
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    season_id = await _create_active_season(client, admin_headers)
    user_a = uuid.uuid4()
    await _seed_membership(db_session, season_id, user_id=user_a, tier="bronze", xp=500)
    await db_session.commit()

    from main import app

    # Point the route's Redis dependency at a client that fails the projection commands.
    async def _override_get_redis() -> AsyncGenerator[_LeagueFailingRedis]:
        yield _LeagueFailingRedis(real_redis)

    app.dependency_overrides[get_redis] = _override_get_redis
    try:
        finalized = await client.post(
            f"/api/v1/admin/seasons/{season_id}/finalize", headers=admin_headers
        )
    finally:
        # Restore the real redis override for the rest of the test.
        async def _restore_redis() -> AsyncGenerator[AsyncRedis]:
            yield real_redis

        app.dependency_overrides[get_redis] = _restore_redis

    # Finalization SUCCEEDED despite the Redis outage — DB is authoritative.
    assert finalized.status_code == 200
    assert finalized.json()["promoted"] == 1
    members = await MembershipRepository(db_session).list_for_season(season_id)
    assert len(members) == 1
    assert members[0].league_tier == "silver"
    assert members[0].outcome == "promoted"

    # The projection is recoverable: rebuild from committed PostgreSQL state and the
    # board is correct even though the outage skipped the automatic refresh.
    await SeasonService(db_session).refresh_league_projection(redis=real_redis, season_id=season_id)
    assert await _page_user_ids(real_redis, season_id, "silver") == [str(user_a)]
    assert await _page_user_ids(real_redis, season_id, "bronze") == []
