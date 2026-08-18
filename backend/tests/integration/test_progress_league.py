"""Slice 09 remediation — FIX-3: `ProgressContext.league` is populated from the
authoritative `SeasonMembership` row of the active season (Option A).

Pins the §5.4 step-5 contract: an active-season member gets their league standing in the
resolved context; no active season, no membership, or a completed season means `league`
is None (never stale active-season state); membership changes are reflected on the next
resolve; and the lookup is per-user (no cross-user leakage).
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.context.resolver import ProgressContextResolver
from gamification.models import LeagueSeason, SeasonMembership

NOW = datetime.now(UTC)


async def _active_season(db_session: AsyncSession, **overrides: object) -> LeagueSeason:
    season = LeagueSeason(
        id=uuid.uuid4(),
        name=overrides.get("name", "Progress League S1"),
        status=overrides.get("status", "active"),
        start_at=NOW - timedelta(days=10),
        end_at=NOW + timedelta(days=10),
        config={},
    )
    db_session.add(season)
    await db_session.flush()
    return season


async def _membership(
    db_session: AsyncSession,
    season: LeagueSeason,
    *,
    user_id: uuid.UUID,
    tier: str,
    xp: int,
) -> SeasonMembership:
    member = SeasonMembership(
        id=uuid.uuid4(),
        user_id=user_id,
        season_id=season.id,
        league_tier=tier,
        xp_this_season=xp,
    )
    db_session.add(member)
    await db_session.flush()
    return member


@pytest.mark.asyncio
async def test_resolver_populates_league_from_active_membership(
    db_session: AsyncSession,
) -> None:
    """A user with an active-season membership gets a populated league standing: tier,
    season XP, season id, and rank all come from the authoritative membership row."""
    season = await _active_season(db_session)
    user_id = uuid.uuid4()
    await _membership(db_session, season, user_id=user_id, tier="bronze", xp=500)
    await db_session.flush()

    context = await ProgressContextResolver(db_session).resolve(user_id)

    assert context.league is not None
    assert context.league.user_id == user_id
    assert context.league.season_id == season.id
    assert context.league.league_tier == "bronze"
    assert context.league.xp_this_season == 500
    # Sole member of the tier -> rank 1; bronze is not the top tier and rank 1 is within
    # the default promotion slots, so the standing correctly reports the promotion zone.
    assert context.league.rank_in_league == 1
    assert context.league.promotion_zone is True
    assert context.league.relegation_zone is False


@pytest.mark.asyncio
async def test_resolver_league_is_none_without_active_season(
    db_session: AsyncSession,
) -> None:
    """No active season -> league stays None (the existing contract)."""
    user_id = uuid.uuid4()
    context = await ProgressContextResolver(db_session).resolve(user_id)
    assert context.league is None


@pytest.mark.asyncio
async def test_resolver_league_is_none_for_user_without_membership(
    db_session: AsyncSession,
) -> None:
    """An active season without the user's membership -> league stays None (they have not
    joined — no invented zero-standing row)."""
    season = await _active_season(db_session)
    await _membership(db_session, season, user_id=uuid.uuid4(), tier="bronze", xp=500)
    await db_session.flush()

    context = await ProgressContextResolver(db_session).resolve(uuid.uuid4())
    assert context.league is None


@pytest.mark.asyncio
async def test_resolver_league_reflects_membership_changes(
    db_session: AsyncSession,
) -> None:
    """Re-resolving after the membership changes returns the CURRENT authoritative state
    (XP and tier both come from the live row, never a cached value)."""
    season = await _active_season(db_session)
    user_id = uuid.uuid4()
    member = await _membership(db_session, season, user_id=user_id, tier="bronze", xp=500)
    await db_session.flush()

    first = await ProgressContextResolver(db_session).resolve(user_id)
    assert first.league is not None
    assert first.league.xp_this_season == 500
    assert first.league.league_tier == "bronze"

    member.xp_this_season = 700
    member.league_tier = "silver"
    await db_session.flush()

    second = await ProgressContextResolver(db_session).resolve(user_id)
    assert second.league is not None
    assert second.league.xp_this_season == 700
    assert second.league.league_tier == "silver"


@pytest.mark.asyncio
async def test_resolver_league_is_none_after_season_completed(
    db_session: AsyncSession,
) -> None:
    """A completed season must NOT leak stale active-season league state into the context
    — `get_active()` only ever returns the live season."""
    season = await _active_season(db_session, status="completed")
    user_id = uuid.uuid4()
    await _membership(db_session, season, user_id=user_id, tier="gold", xp=900)
    await db_session.flush()

    context = await ProgressContextResolver(db_session).resolve(user_id)
    assert context.league is None


@pytest.mark.asyncio
async def test_resolver_league_rank_uses_deterministic_tiebreak(
    db_session: AsyncSession,
) -> None:
    """Ranks within the tier follow the same deterministic tie-break as finalization and
    the Redis ZSET read path: xp desc, then member id DESCENDING for equal scores."""
    season = await _active_season(db_session)
    a = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    b = uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
    c = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccccc")
    await _membership(db_session, season, user_id=a, tier="silver", xp=300)
    await _membership(db_session, season, user_id=b, tier="silver", xp=300)
    await _membership(db_session, season, user_id=c, tier="silver", xp=100)
    await db_session.flush()

    resolver = ProgressContextResolver(db_session)
    league_a = (await resolver.resolve(a)).league
    league_b = (await resolver.resolve(b)).league
    league_c = (await resolver.resolve(c)).league

    # Equal XP breaks by member id DESCENDING (same as finalization and the Redis ZSET
    # read path): b (higher id) ranks above a; the lower-XP member ranks last.
    assert league_a is not None and league_a.rank_in_league == 2
    assert league_b is not None and league_b.rank_in_league == 1
    assert league_c is not None and league_c.rank_in_league == 3


@pytest.mark.asyncio
async def test_resolver_league_is_user_isolated(db_session: AsyncSession) -> None:
    """Two users in the same active season: each context carries ONLY its own standing."""
    season = await _active_season(db_session)
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()
    await _membership(db_session, season, user_id=user_a, tier="bronze", xp=500)
    await _membership(db_session, season, user_id=user_b, tier="gold", xp=1200)
    await db_session.flush()

    resolver = ProgressContextResolver(db_session)
    league_a = (await resolver.resolve(user_a)).league
    league_b = (await resolver.resolve(user_b)).league

    assert league_a is not None and league_a.user_id == user_a
    assert league_b is not None and league_b.user_id == user_b
    assert league_a.league_tier == "bronze"
    assert league_b.league_tier == "gold"
    assert league_a.xp_this_season == 500
    assert league_b.xp_this_season == 1200


@pytest.mark.asyncio
async def test_progress_api_serves_populated_league_from_snapshot(
    client: object,
    db_session: AsyncSession,
) -> None:
    """`GET /me/progress` reads the saved snapshot — with the resolver now populating
    `league`, the API serves a typed LeagueStanding instead of null."""
    import uuid as _uuid

    from httpx import AsyncClient

    from tests.conftest import register_and_login

    assert isinstance(client, AsyncClient)
    token = await register_and_login(client, "progress-league@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    user_id = _uuid.UUID(me.json()["id"])

    season = await _active_season(db_session)
    await _membership(db_session, season, user_id=user_id, tier="bronze", xp=500)
    await db_session.flush()

    await ProgressContextResolver(db_session).resolve(user_id)
    await db_session.commit()

    response = await client.get("/api/v1/me/progress", headers=headers)
    assert response.status_code == 200
    ctx = response.json()
    assert ctx["league"] is not None
    assert ctx["league"]["user_id"] == str(user_id)
    assert ctx["league"]["season_id"] == str(season.id)
    assert ctx["league"]["league_tier"] == "bronze"
    assert ctx["league"]["xp_this_season"] == 500
    assert ctx["league"]["rank_in_league"] == 1
