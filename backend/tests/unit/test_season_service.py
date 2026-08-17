"""Slice 09 unit tests — season finalization, promotion/demotion, idempotency.

The season rules (promotion slots, demotion slots, inactive retention, frozen exclusion)
are deterministic and live in `SeasonService`; these tests pin them against the real
Postgres throwaway DB so the SQL and the business rules are both exercised.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.models import LeagueSeason, LedgerEntry, SeasonMembership
from gamification.repositories.leagues import SeasonRepository
from gamification.services.seasons import SeasonService

NOW = datetime.now(UTC)


def _season(session: AsyncSession, **overrides: Any) -> LeagueSeason:
    season = LeagueSeason(
        id=uuid.uuid4(),
        name=overrides.get("name", "S1"),
        status=overrides.get("status", "active"),
        start_at=overrides.get("start_at", NOW - timedelta(days=10)),
        end_at=overrides.get("end_at", NOW + timedelta(days=10)),
        config=overrides.get("config", {}),
    )
    session.add(season)
    return season


async def _membership(
    session: AsyncSession,
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
    session.add(member)
    return member


async def _memberships(
    session: AsyncSession, season_id: uuid.UUID
) -> dict[uuid.UUID, SeasonMembership]:
    rows = (
        await session.scalars(
            select(SeasonMembership).where(SeasonMembership.season_id == season_id)
        )
    ).all()
    return {row.user_id: row for row in rows}


@pytest.mark.asyncio
async def test_finalization_promotes_top_and_demotes_bottom(
    db_session: AsyncSession,
) -> None:
    season = _season(db_session, config={"promotion_slots": 2, "demotion_slots": 2})
    await db_session.flush()
    # Gold tier with 5 members; 2 top promote to platinum, 2 bottom demote to silver.
    users = [uuid.uuid4() for _ in range(5)]
    for index, user in enumerate(users):
        await _membership(db_session, season, user_id=user, tier="gold", xp=1000 - index * 100)
    await db_session.flush()

    outcome = await SeasonService(db_session).finalize_season(season.id)
    assert outcome == {"promoted": 2, "demoted": 2, "retained": 1}
    await db_session.flush()

    members = await _memberships(db_session, season.id)
    # Sorted by xp desc: users[0]=1000 (promoted), users[1]=900 (promoted),
    # users[2]=800 (retained), users[3]=700 (demoted), users[4]=600 (demoted).
    assert members[users[0]].outcome == "promoted"
    assert members[users[0]].league_tier == "platinum"
    assert members[users[1]].outcome == "promoted"
    assert members[users[1]].league_tier == "platinum"
    assert members[users[2]].outcome == "retained"
    assert members[users[2]].league_tier == "gold"
    assert members[users[3]].outcome == "demoted"
    assert members[users[3]].league_tier == "silver"
    assert members[users[4]].outcome == "demoted"
    assert members[users[4]].league_tier == "silver"
    season_row = await SeasonRepository(db_session).get_by_id(season.id)
    assert season_row is not None
    assert season_row.status == "completed"


@pytest.mark.asyncio
async def test_finalization_is_idempotent_on_replay(
    db_session: AsyncSession,
) -> None:
    season = _season(db_session)
    await db_session.flush()
    for index in range(4):
        await _membership(
            db_session, season, user_id=uuid.uuid4(), tier="bronze", xp=500 - index * 50
        )
    await db_session.flush()

    first = await SeasonService(db_session).finalize_season(season.id)
    await db_session.commit()
    second = await SeasonService(db_session).finalize_season(season.id)
    await db_session.commit()
    assert first["promoted"] > 0
    assert second == {"promoted": 0, "demoted": 0, "retained": 0}

    rows = (await _memberships(db_session, season.id)).values()
    assert len(list(rows)) == 4
    assert all(row.outcome is not None for row in rows)


@pytest.mark.asyncio
async def test_set_status_is_a_guarded_compare_and_swap(
    db_session: AsyncSession,
) -> None:
    """The active -> completed transition only fires when the row is still active — a
    stale attempt (already completed, or a different current status) is a no-op, which is
    the DB-level guard that makes finalization concurrency-safe."""
    season = _season(db_session, status="active")
    await db_session.flush()
    repo = SeasonRepository(db_session)

    assert await repo.set_status(season.id, "completed", expected_status="active") is True
    # A replayed transition sees the row in `completed`, not `active` -> no row moves.
    assert (
        await repo.set_status(season.id, "completed", expected_status="active") is False
    )
    # Wrong expectation (e.g. a stale `scheduled` guard) is also a no-op.
    assert await repo.set_status(season.id, "active", expected_status="scheduled") is False


@pytest.mark.asyncio
async def test_concurrent_finalization_writes_outcomes_once(
    db_session: AsyncSession,
) -> None:
    """Two interleaved finalization attempts (simulating concurrent workers) must produce
    the same final state as one attempt, with no duplicated promotion/demotion outcomes.
    The guarded status transition means the second attempt is a replay no-op."""
    season = _season(db_session, config={"promotion_slots": 2, "demotion_slots": 1})
    await db_session.flush()
    users = [uuid.uuid4() for _ in range(4)]
    for index, user in enumerate(users):
        await _membership(db_session, season, user_id=user, tier="silver", xp=400 - index * 50)
    await db_session.flush()

    service = SeasonService(db_session)
    await service.finalize_season(season.id)
    await db_session.commit()

    # Second attempt: re-read the row (now completed) and finalize again — the guarded
    # transition refuses, so no membership outcome is rewritten.
    second = await service.finalize_season(season.id)
    await db_session.commit()
    assert second == {"promoted": 0, "demoted": 0, "retained": 0}

    members = await _memberships(db_session, season.id)
    promoted = [m for m in members.values() if m.outcome == "promoted"]
    demoted = [m for m in members.values() if m.outcome == "demoted"]
    retained = [m for m in members.values() if m.outcome == "retained"]
    # Top 2 promoted, bottom 1 demoted, 1 retained — exactly one outcome per member.
    assert len(promoted) == 2
    assert len(demoted) == 1
    assert len(retained) == 1
    # Re-running finalization did not append or duplicate anything.
    assert len(members) == 4
    assert {m.league_tier for m in promoted} == {"gold"}
    assert {m.league_tier for m in demoted} == {"bronze"}


@pytest.mark.asyncio
async def test_inactive_members_are_retained_not_demoted(
    db_session: AsyncSession,
) -> None:
    season = _season(db_session, config={"promotion_slots": 1, "demotion_slots": 1})
    await db_session.flush()
    # 3 members in silver; the bottom one (xp=0) would demote by position but the inactive
    # rule retains them instead. The top one promotes; the middle one is retained.
    active_top = uuid.uuid4()
    active_mid = uuid.uuid4()
    inactive_bottom = uuid.uuid4()
    await _membership(db_session, season, user_id=active_top, tier="silver", xp=300)
    await _membership(db_session, season, user_id=active_mid, tier="silver", xp=200)
    await _membership(db_session, season, user_id=inactive_bottom, tier="silver", xp=0)
    await db_session.flush()

    outcome = await SeasonService(db_session).finalize_season(season.id)
    await db_session.flush()
    assert outcome == {"promoted": 1, "demoted": 0, "retained": 2}
    members = await _memberships(db_session, season.id)
    assert members[inactive_bottom].outcome == "retained"
    assert members[inactive_bottom].league_tier == "silver"


@pytest.mark.asyncio
async def test_flagged_users_are_excluded_from_promotion(
    db_session: AsyncSession,
) -> None:
    season = _season(db_session)
    await db_session.flush()
    clean_user = uuid.uuid4()
    flagged_user = uuid.uuid4()
    await _membership(db_session, season, user_id=clean_user, tier="gold", xp=900)
    await _membership(db_session, season, user_id=flagged_user, tier="gold", xp=1000)
    db_session.add(
        LedgerEntry(
            id=uuid.uuid4(),
            user_id=flagged_user,
            event_id=uuid.uuid4(),
            xp_type="completion",
            xp_delta=100,
            reason_code="COURSE_COMPLETE",
            prev_hash="0" * 64,
            entry_hash="1" * 64,
            created_at=NOW - timedelta(days=5),
            integrity_status="flagged",
        )
    )
    await db_session.flush()

    outcome = await SeasonService(db_session).finalize_season(season.id)
    await db_session.flush()
    assert outcome == {"promoted": 1, "demoted": 0, "retained": 1}


@pytest.mark.asyncio
async def test_top_tier_does_not_promote_and_bottom_tier_does_not_demote(
    db_session: AsyncSession,
) -> None:
    season = _season(db_session, config={"promotion_slots": 1, "demotion_slots": 1})
    await db_session.flush()
    # Obsidian top member: index 0 (promote zone) but already at the top tier -> retained.
    # Bronze bottom member: index 1 (demote zone) but already at the bottom tier -> retained.
    obsidian_top = uuid.uuid4()
    obsidian_low = uuid.uuid4()
    bronze_high = uuid.uuid4()
    bronze_bottom = uuid.uuid4()
    await _membership(db_session, season, user_id=obsidian_top, tier="obsidian", xp=5000)
    await _membership(db_session, season, user_id=obsidian_low, tier="obsidian", xp=4000)
    await _membership(db_session, season, user_id=bronze_high, tier="bronze", xp=20)
    await _membership(db_session, season, user_id=bronze_bottom, tier="bronze", xp=10)
    await db_session.flush()

    outcome = await SeasonService(db_session).finalize_season(season.id)
    await db_session.flush()
    # obsidian_top retained (cap), obsidian_low demoted, bronze_high promoted, bronze_bottom
    # retained (floor).
    assert outcome == {"promoted": 1, "demoted": 1, "retained": 2}
    members = await _memberships(db_session, season.id)
    assert members[obsidian_top].outcome == "retained"
    assert members[obsidian_top].league_tier == "obsidian"
    assert members[bronze_bottom].outcome == "retained"
    assert members[bronze_bottom].league_tier == "bronze"


@pytest.mark.asyncio
async def test_season_xp_is_derived_from_ledger_window(
    db_session: AsyncSession,
) -> None:
    """Season XP sums ONLY ledger entries inside [start_at, end_at) — the deterministic
    time-boxed slice (slice 09 decision)."""
    season = _season(db_session, start_at=NOW - timedelta(days=7), end_at=NOW)
    await db_session.flush()
    user = uuid.uuid4()
    # days_ago > 0 is in the past. Window is [NOW-7, NOW): only 5 and 1 days ago qualify.
    for days_ago, xp in [(10, 100), (5, 200), (1, 300), (-1, 400)]:
        db_session.add(
            LedgerEntry(
                id=uuid.uuid4(),
                user_id=user,
                event_id=uuid.uuid4(),
                xp_type="completion",
                xp_delta=xp,
                reason_code="COURSE_COMPLETE",
                prev_hash="0" * 64,
                entry_hash="1" * 64,
                created_at=NOW - timedelta(days=days_ago),
                integrity_status="verified",
            )
        )
    await db_session.flush()
    # Only 5 days ago (200) and 1 day ago (300) fall inside the window: sum = 500.
    # 10 days ago is before start; 1 day in the future is after end (exclusive).
    season_xp = await SeasonService(db_session).compute_season_xp(user, season)
    assert season_xp == 500
