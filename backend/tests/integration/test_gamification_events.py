"""Phase 0 event -> Integrity Gate -> ledger -> ProgressContext acceptance coverage."""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.context.resolver import ProgressContextResolver
from gamification.repositories.ledger import LedgerRepository
from gamification.services.event_processor import GamificationEventProcessor
from platform_core.events.schema import CourseCompletedEvent


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
    assert entries[0].xp_delta == 400
    assert context.rank.completion_xp == 400
