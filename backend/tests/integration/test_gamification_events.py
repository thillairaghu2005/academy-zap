"""Phase 0 event -> Integrity Gate -> ledger -> ProgressContext acceptance coverage."""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.context.resolver import ProgressContextResolver
from gamification.repositories.ledger import LedgerRepository
from gamification.rules import COURSE_COMPLETION_XP
from gamification.services.event_processor import GamificationEventProcessor
from platform_core.events.schema import CourseCompletedEvent


def _course_event(
    *, user_id: uuid.UUID, course_id: uuid.UUID | None = None
) -> CourseCompletedEvent:
    return CourseCompletedEvent(
        user_id=user_id,
        idempotency_key=str(uuid.uuid4()),
        session_fingerprint="test-session",
        course_id=course_id if course_id is not None else uuid.uuid4(),
        category="web_development",
        time_spent_seconds=3600,
    )


@pytest.mark.asyncio
async def test_course_completion_awards_server_defined_xp_once(
    db_session: AsyncSession,
) -> None:
    user_id = uuid.uuid4()
    event = CourseCompletedEvent(
        user_id=user_id,
        idempotency_key=str(uuid.uuid4()),
        session_fingerprint="test-session",
        course_id=uuid.uuid4(),
        category="web_development",
        time_spent_seconds=3600,
    )

    processor = GamificationEventProcessor(db_session)
    await processor.process(event)
    await processor.process(event)
    await db_session.commit()

    entries = await LedgerRepository(db_session).list_for_user(user_id)
    context = await ProgressContextResolver(db_session).resolve(user_id)

    assert len(entries) == 1
    assert entries[0].xp_delta == COURSE_COMPLETION_XP
    assert context.rank.completion_xp == COURSE_COMPLETION_XP


@pytest.mark.asyncio
async def test_same_course_replay_awards_no_additional_completion_xp(
    db_session: AsyncSession,
) -> None:
    """Slice 09 remediation (FIX-4): completion XP is capped per course. A SECOND,
    distinct completion event for the SAME course awards 0 additional XP — same-course
    replay can never farm completion XP (the invariant the audit requires)."""
    user_id = uuid.uuid4()
    course_id = uuid.uuid4()
    processor = GamificationEventProcessor(db_session)

    await processor.process(_course_event(user_id=user_id, course_id=course_id))
    await processor.process(_course_event(user_id=user_id, course_id=course_id))
    await db_session.commit()

    entries = await LedgerRepository(db_session).list_for_user(user_id)
    context = await ProgressContextResolver(db_session).resolve(user_id)

    # First completion awarded the full amount; the replay appended a zero-delta audit
    # entry (the event happened, but no NEW XP) — total completion XP never exceeds the cap.
    assert len(entries) == 2
    assert entries[0].xp_delta == COURSE_COMPLETION_XP
    assert entries[1].xp_delta == 0
    assert context.rank.completion_xp == COURSE_COMPLETION_XP


@pytest.mark.asyncio
async def test_different_course_remains_fully_eligible(db_session: AsyncSession) -> None:
    """The cap is PER COURSE: completing a different course awards the full amount again."""
    user_id = uuid.uuid4()
    processor = GamificationEventProcessor(db_session)

    await processor.process(_course_event(user_id=user_id, course_id=uuid.uuid4()))
    await processor.process(_course_event(user_id=user_id, course_id=uuid.uuid4()))
    await db_session.commit()

    context = await ProgressContextResolver(db_session).resolve(user_id)
    assert context.rank.completion_xp == COURSE_COMPLETION_XP * 2
