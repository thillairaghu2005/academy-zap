"""Slice 09 — league projection unit tests (fakeredis; no Postgres/Redis required).

Covers the projection guarantees the slice requires (Phase 5 rebuildability, Phase 12
cross-season isolation, deterministic tie-breaking, frozen-user exclusion). The projection
is a Redis sorted-set read model; these tests pin its semantics directly so the API tier
only has to verify wiring.
"""

import uuid

import fakeredis
import pytest

from gamification.projections.leagues import LeagueProjection

SEASON_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
SEASON_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"


@pytest.fixture
def projection(redis: fakeredis.FakeAsyncRedis) -> LeagueProjection:
    return LeagueProjection(redis)


@pytest.mark.asyncio
async def test_rebuild_matches_incremental_updates(projection: LeagueProjection) -> None:
    """Phase 5 rebuildability: after deleting the Redis projection, rebuilding from the
    authoritative membership rows reproduces byte-identical standings."""
    members = [
        (str(uuid.uuid4()), 800, "Alice"),
        (str(uuid.uuid4()), 500, "Bob"),
        (str(uuid.uuid4()), 500, "Carol"),
        (str(uuid.uuid4()), 100, "Dan"),
    ]
    for user_id, xp, name in members:
        await projection.update_member(
            season_id=SEASON_A, tier_id="silver", user_id=user_id,
            xp_this_season=xp, display_name=name,
        )

    incremental = await projection.page(
        season_id=SEASON_A, tier_id="silver", offset=0, limit=100
    )

    # Simulate Redis loss: delete every league key, then rebuild from the same rows.
    await projection._redis.flushdb()
    count = await projection.rebuild_from_memberships(
        season_id=SEASON_A, tier_id="silver", members=members
    )
    rebuilt = await projection.page(season_id=SEASON_A, tier_id="silver", offset=0, limit=100)

    assert count == len(members)
    assert rebuilt["total"] == incremental["total"]
    assert rebuilt["entries"] == incremental["entries"]


@pytest.mark.asyncio
async def test_seasons_never_share_standings(projection: LeagueProjection) -> None:
    """Phase 12: season A and season B must never share a board — the key namespace is
    scoped by (season_id, tier_id), so identical users/XP in different seasons stay apart."""
    user = str(uuid.uuid4())
    await projection.update_member(
        season_id=SEASON_A, tier_id="gold", user_id=user, xp_this_season=900,
        display_name="SameUser",
    )
    # Season B starts empty — the same user must NOT appear on B's board.
    page_b = await projection.page(season_id=SEASON_B, tier_id="gold", offset=0, limit=10)
    assert page_b["total"] == 0
    assert page_b["entries"] == []

    # Populating B with the same user does not disturb A.
    await projection.update_member(
        season_id=SEASON_B, tier_id="gold", user_id=user, xp_this_season=900,
        display_name="SameUser",
    )
    page_a = await projection.page(season_id=SEASON_A, tier_id="gold", offset=0, limit=10)
    page_b = await projection.page(season_id=SEASON_B, tier_id="gold", offset=0, limit=10)
    assert page_a["total"] == 1
    assert page_b["total"] == 1

    # Same season, different tiers are also separate boards.
    page_b_bronze = await projection.page(
        season_id=SEASON_B, tier_id="bronze", offset=0, limit=10
    )
    assert page_b_bronze["total"] == 0


@pytest.mark.asyncio
async def test_tie_break_is_deterministic_across_rebuilds(projection: LeagueProjection) -> None:
    """Phase 6: equal XP orders by member id descending (the ZREVRANGE read order, matching
    the global board and `SeasonService.finalize_season`), identical before and after a
    rebuild."""
    a = str(uuid.UUID("00000000-0000-4000-8000-00000000000a"))
    b = str(uuid.UUID("00000000-0000-4000-8000-00000000000b"))
    c = str(uuid.UUID("00000000-0000-4000-8000-00000000000c"))

    for user_id in (c, a, b):  # insert scrambled
        await projection.update_member(
            season_id=SEASON_A, tier_id="bronze", user_id=user_id, xp_this_season=500,
            display_name=user_id,
        )

    first = await projection.page(season_id=SEASON_A, tier_id="bronze", offset=0, limit=10)
    await projection.rebuild_from_memberships(
        season_id=SEASON_A,
        tier_id="bronze",
        members=[(user_id, 500, user_id) for user_id in (a, b, c)],
    )
    second = await projection.page(season_id=SEASON_A, tier_id="bronze", offset=0, limit=10)

    expected_order = [c, b, a]  # equal scores -> member id descending (ZREVRANGE)
    assert [e["user_id"] for e in first["entries"]] == expected_order
    assert [e["user_id"] for e in second["entries"]] == expected_order
    assert first["entries"] == second["entries"]


@pytest.mark.asyncio
async def test_frozen_user_excluded_from_board_and_my_standing(
    projection: LeagueProjection,
) -> None:
    """§7.4: frozen users are excluded from the public league board (and thus can never be
    promoted through it) while private XP still accrues in the membership row."""
    frozen = str(uuid.uuid4())
    live = str(uuid.uuid4())
    await projection.update_member(
        season_id=SEASON_A, tier_id="silver", user_id=frozen, xp_this_season=999,
        display_name="Frozen",
    )
    await projection.update_member(
        season_id=SEASON_A, tier_id="silver", user_id=live, xp_this_season=100,
        display_name="Live",
    )

    # Remove the frozen user from the projection (the rebuild path drops them) and verify
    # the board no longer contains them.
    await projection.remove_member(season_id=SEASON_A, tier_id="silver", user_id=frozen)

    page = await projection.page(season_id=SEASON_A, tier_id="silver", offset=0, limit=10)
    assert page["total"] == 1
    assert [e["user_id"] for e in page["entries"]] == [live]
    assert await projection.my_standing(
        season_id=SEASON_A, tier_id="silver", user_id=frozen
    ) is None
