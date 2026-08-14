"""Integration tier: ledger append -> resolver -> ProgressContext, end to end against a real
throwaway Postgres. Exercises the bounded resolver (gamification §5.4 steps 1-4, 6, 7) built for
this round — league/guild stay None, projections aren't built yet.
"""

import uuid

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
