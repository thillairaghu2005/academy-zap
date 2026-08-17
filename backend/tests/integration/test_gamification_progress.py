"""Integration tier: ledger append -> resolver -> ProgressContext, end to end against a real
throwaway Postgres. Exercises the bounded resolver (gamification §5.4 steps 1-4, 6, 7) built for
this round — league/guild stay None, projections aren't built yet.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.context.resolver import ProgressContextResolver
from gamification.repositories.ledger import LedgerRepository


@pytest.mark.asyncio
async def test_resolver_aggregates_xp_and_resolves_rank(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    ledger = LedgerRepository(db_session)

    await ledger.append(
        user_id=user_id,
        event_id=uuid.uuid4(),
        xp_type="completion",
        xp_delta=500,
        reason_code="COURSE_COMPLETE",
    )
    await ledger.append(
        user_id=user_id,
        event_id=uuid.uuid4(),
        xp_type="mastery",
        xp_delta=300,
        reason_code="ASSESSMENT_PASSED",
    )
    await db_session.commit()

    context = await ProgressContextResolver(db_session).resolve(user_id)

    assert context.rank.completion_xp == 500
    assert context.rank.mastery_xp == 300
    assert context.context_version == 1
    assert context.freeze_status == "live"
    assert context.league is None
    assert context.guild is None


@pytest.mark.asyncio
async def test_resolver_increments_context_version_on_recompute(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    ledger = LedgerRepository(db_session)
    await ledger.append(
        user_id=user_id, event_id=uuid.uuid4(), xp_type="completion", xp_delta=100, reason_code="X"
    )
    await db_session.commit()

    resolver = ProgressContextResolver(db_session)
    first = await resolver.resolve(user_id)
    second = await resolver.resolve(user_id)

    assert first.context_version == 1
    assert second.context_version == 2


@pytest.mark.asyncio
async def test_a_flagged_entry_freezes_public_visibility_without_losing_xp(
    db_session: AsyncSession,
) -> None:
    """gamification §5.4 step 6: flagging never deletes XP, it only freezes visibility."""
    user_id = uuid.uuid4()
    ledger = LedgerRepository(db_session)
    await ledger.append(
        user_id=user_id,
        event_id=uuid.uuid4(),
        xp_type="completion",
        xp_delta=1_000,
        reason_code="SUSPICIOUS_VELOCITY",
        integrity_status="flagged",
    )
    await db_session.commit()

    context = await ProgressContextResolver(db_session).resolve(user_id)

    assert context.rank.completion_xp == 1_000  # private XP still accrued
    assert context.freeze_status == "frozen_pending_review"
    assert "integrity_review_pending" in context.unresolved_flags


@pytest.mark.asyncio
async def test_replaying_an_event_does_not_append_duplicate_xp(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    event_id = uuid.uuid4()
    ledger = LedgerRepository(db_session)

    first = await ledger.append(
        user_id=user_id,
        event_id=event_id,
        xp_type="completion",
        xp_delta=100,
        reason_code="COURSE_COMPLETE",
    )
    second = await ledger.append(
        user_id=user_id,
        event_id=event_id,
        xp_type="completion",
        xp_delta=100,
        reason_code="COURSE_COMPLETE",
    )

    assert second.id == first.id
    assert len(await ledger.list_for_user(user_id)) == 1


# ---------------------------------------------------------------------------
# Slice 05 §5 — streak resolution edge cases, at the resolver integration tier.
# `_resolve_streak` derives activity days from ledger entry created_at (UTC), so
# entries are back-dated directly in the DB to pin the timeline. Timezone
# behavior is UTC per the existing resolver (datetime.now(UTC).date()).
# ---------------------------------------------------------------------------


async def _seed_activity_on_days(
    db_session: AsyncSession,
    user_id: uuid.UUID,
    day_offsets: list[int],
) -> None:
    """Append one verified entry per day offset, then re-chain the timeline so each entry's
    `created_at` lands on the requested UTC day (0 = today). The hash chain embeds created_at,
    so back-dating requires recomputing prev_hash/entry_hash in chain order — a direct-DB
    update alone would break the chain and fail the resolver's verify-first step.
    """
    ledger = LedgerRepository(db_session)
    for _ in day_offsets:
        await ledger.append(
            user_id=user_id,
            event_id=uuid.uuid4(),
            xp_type="completion",
            xp_delta=100,
            reason_code="COURSE_COMPLETE",
        )
    await db_session.flush()

    entries = await ledger.list_for_user(user_id)
    assert len(entries) == len(day_offsets)
    # Oldest first: the largest day_offset is the earliest UTC date.
    ordered = sorted(
        zip(entries, day_offsets, strict=True),
        key=lambda pair: pair[1],
        reverse=True,
    )
    from gamification.integrity.ledger_hash import GENESIS_HASH, HashableEntry, compute_entry_hash

    prev_hash = GENESIS_HASH
    now = datetime.now(UTC)
    # Strictly increasing microsecond offsets per chain position keep `list_for_user`'s
    # (created_at, id) ordering identical to the chain order even when entries share a day.
    for position, (entry, offset) in enumerate(ordered):
        entry.created_at = now - timedelta(days=offset) + timedelta(microseconds=position)
        entry.prev_hash = prev_hash
        entry.entry_hash = compute_entry_hash(
            prev_hash,
            HashableEntry(
                user_id=entry.user_id,
                xp_delta=entry.xp_delta,
                reason_code=entry.reason_code,
                created_at=entry.created_at,
            ),
        )
        prev_hash = entry.entry_hash
    await db_session.commit()


@pytest.mark.asyncio
async def test_streak_first_activity_is_active_with_one_day(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    await _seed_activity_on_days(db_session, user_id, [0])

    context = await ProgressContextResolver(db_session).resolve(user_id)

    assert context.streak.status == "active"
    assert context.streak.current_streak_days == 1
    assert context.streak.longest_streak_days == 1


@pytest.mark.asyncio
async def test_streak_same_day_repeated_activity_counts_once(db_session: AsyncSession) -> None:
    """Multiple ledger entries on the same UTC day collapse into one active day — a client
    cannot inflate a streak by re-completing lessons/assessments within a day."""
    user_id = uuid.uuid4()
    await _seed_activity_on_days(db_session, user_id, [0, 0, 0, 0])

    context = await ProgressContextResolver(db_session).resolve(user_id)

    assert context.streak.status == "active"
    assert context.streak.current_streak_days == 1
    assert context.streak.longest_streak_days == 1


@pytest.mark.asyncio
async def test_streak_consecutive_days_accumulates(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    await _seed_activity_on_days(db_session, user_id, [0, 1, 2])

    context = await ProgressContextResolver(db_session).resolve(user_id)

    assert context.streak.status == "active"
    assert context.streak.current_streak_days == 3
    assert context.streak.longest_streak_days == 3


@pytest.mark.asyncio
async def test_streak_gap_beyond_grace_period_breaks_it(db_session: AsyncSession) -> None:
    """Activity 3+ days ago with nothing since → broken, current resets to 0 while the longest
    run is preserved (the client renders the server verdict verbatim)."""
    user_id = uuid.uuid4()
    await _seed_activity_on_days(db_session, user_id, [3, 4, 5])

    context = await ProgressContextResolver(db_session).resolve(user_id)

    assert context.streak.status == "broken"
    assert context.streak.current_streak_days == 0
    assert context.streak.longest_streak_days == 3


@pytest.mark.asyncio
async def test_streak_one_day_gap_is_grace_period(db_session: AsyncSession) -> None:
    """Most recent activity yesterday (gap == 1 day) → grace_period; the run is preserved."""
    user_id = uuid.uuid4()
    await _seed_activity_on_days(db_session, user_id, [1, 2])

    context = await ProgressContextResolver(db_session).resolve(user_id)

    assert context.streak.status == "grace_period"
    assert context.streak.current_streak_days == 2


@pytest.mark.asyncio
async def test_streak_no_activity_is_broken_with_zero_days(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()

    context = await ProgressContextResolver(db_session).resolve(user_id)

    assert context.streak.status == "broken"
    assert context.streak.current_streak_days == 0
    assert context.streak.longest_streak_days == 0
    assert context.streak.momentum_multiplier == 1.0
    assert context.streak.last_active_date == datetime.now(UTC).date()
