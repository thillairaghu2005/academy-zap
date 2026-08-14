"""Integration tier: the same event delivered twice must produce exactly one processed marker
(build.md B1's exit gate) — no HTTP involved, but real throwaway Postgres.
"""

import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from platform_core.events.idempotency import IdempotencyRepository
from platform_core.events.models import ProcessedEvent


@pytest.mark.asyncio
async def test_redelivery_of_the_same_key_is_a_no_op(db_session: AsyncSession) -> None:
    repo = IdempotencyRepository(db_session)
    idempotency_key = str(uuid.uuid4())

    first = await repo.try_mark_processed(
        idempotency_key=idempotency_key,
        consumer_group="gamification",
        event_type="course.completed",
    )
    second = await repo.try_mark_processed(
        idempotency_key=idempotency_key,
        consumer_group="gamification",
        event_type="course.completed",
    )

    assert first is True
    assert second is False


@pytest.mark.asyncio
async def test_the_same_key_is_independent_per_consumer_group(db_session: AsyncSession) -> None:
    """Two different subsystems each processing the same event exactly once is not the same
    thing as one subsystem processing it twice — see the idempotency table's docstring.
    """
    repo = IdempotencyRepository(db_session)
    idempotency_key = str(uuid.uuid4())

    gamification_first = await repo.try_mark_processed(
        idempotency_key=idempotency_key,
        consumer_group="gamification",
        event_type="course.completed",
    )
    notifications_first = await repo.try_mark_processed(
        idempotency_key=idempotency_key,
        consumer_group="notifications",
        event_type="course.completed",
    )

    assert gamification_first is True
    assert notifications_first is True


@pytest.mark.asyncio
async def test_first_delivery_retains_the_raw_event_payload(db_session: AsyncSession) -> None:
    repo = IdempotencyRepository(db_session)
    key = str(uuid.uuid4())
    raw_event = {"event_id": str(uuid.uuid4()), "question_level_answers": [{"time_ms": 900}]}

    assert await repo.try_mark_processed(
        idempotency_key=key,
        consumer_group="gamification",
        event_type="assessment.submitted",
        raw_event=raw_event,
    )

    row = (
        await db_session.execute(
            select(ProcessedEvent).where(
                ProcessedEvent.idempotency_key == key,
                ProcessedEvent.consumer_group == "gamification",
            )
        )
    ).scalar_one()
    assert row.raw_event == raw_event
