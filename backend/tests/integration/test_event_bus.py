"""Integration tier: B1's exit gate — "a hand-emitted event flows producer -> stream -> consumer
-> idempotency check, and a replay of the same event changes nothing." Real fakeredis Streams,
real throwaway Postgres for the idempotency table.
"""

import uuid

import fakeredis
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from platform_core.bus.consumer import EventConsumer
from platform_core.bus.producer import publish
from platform_core.events.idempotency import IdempotencyRepository
from platform_core.events.schema import CourseCompletedEvent


def _course_completed_event() -> CourseCompletedEvent:
    return CourseCompletedEvent(
        user_id=uuid.uuid4(),
        idempotency_key=str(uuid.uuid4()),
        session_fingerprint="test-fingerprint",
        course_id=uuid.uuid4(),
        category="web_development",
        time_spent_seconds=3600,
    )


@pytest.mark.asyncio
async def test_a_published_event_is_delivered_and_deduplicated_on_replay(
    redis: fakeredis.FakeAsyncRedis, db_session: AsyncSession
) -> None:
    event = _course_completed_event()
    await publish(event, redis)

    consumer = EventConsumer(group="test-consumers", consumer_name="worker-1", redis=redis)
    idempotency = IdempotencyRepository(db_session)

    delivered = [message async for message in consumer.read_batch(count=10, block_ms=100)]
    assert len(delivered) == 1
    assert delivered[0].event is not None
    assert delivered[0].event.event_id == event.event_id
    first_delivery = await idempotency.try_mark_processed(
        idempotency_key=delivered[0].event.idempotency_key,
        consumer_group="test-consumers",
        event_type=delivered[0].event_type,
    )
    await consumer.ack(delivered[0].message_id)
    assert first_delivery is True

    # Simulate redelivery of the same underlying event (e.g. a consumer crash-retry) — the
    # idempotency check, not stream mechanics, is what must make this a no-op.
    second_check = await idempotency.try_mark_processed(
        idempotency_key=event.idempotency_key,
        consumer_group="test-consumers",
        event_type=event.event_type,
    )
    assert second_check is False


@pytest.mark.asyncio
async def test_an_acked_message_is_not_redelivered_to_the_same_group(
    redis: fakeredis.FakeAsyncRedis,
) -> None:
    event = _course_completed_event()
    await publish(event, redis)

    consumer = EventConsumer(group="ack-test-group", consumer_name="worker-1", redis=redis)
    first_batch = [message async for message in consumer.read_batch(count=10, block_ms=100)]
    assert len(first_batch) == 1
    await consumer.ack(first_batch[0].message_id)

    second_batch = [message async for message in consumer.read_batch(count=10, block_ms=100)]
    assert second_batch == []
