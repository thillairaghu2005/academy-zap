"""Minimal Arq worker — proves the B1 exit gate end-to-end: producer -> stream -> consumer ->
idempotency check, and a replay of the same event changes nothing. Subsystem-specific event
handling (writing ledger entries, sending notifications, etc.) is each subsystem's own job,
built on top of `EventConsumer` directly or via a future dedicated worker task per subsystem.
"""

import json
from typing import Any

import structlog
from arq import cron
from arq.connections import RedisSettings

from gamification.projections.leaderboard import LeaderboardProjection
from gamification.services.event_processor import GamificationEventProcessor
from platform_core.bus.consumer import EventConsumer
from platform_core.bus.dlq import send_to_dlq
from platform_core.core.config import settings
from platform_core.core.db.session import session_scope
from platform_core.core.redis import get_redis_client
from platform_core.core.repositories.user import UserRepository
from platform_core.events.idempotency import IdempotencyRepository

logger = structlog.get_logger(__name__)

FOUNDATION_CONSUMER_GROUP = "platform_core_foundation"


async def poll_events(_ctx: dict[Any, Any], *_args: Any, **_kwargs: Any) -> int:
    """Drains one batch from the shared stream for the foundation consumer group, marking each
    event's idempotency key processed. Returns the number of events processed (0 = idle).
    """
    redis = get_redis_client()
    consumer = EventConsumer(group=FOUNDATION_CONSUMER_GROUP, consumer_name="worker-1", redis=redis)

    processed = 0
    async with session_scope() as session:
        repo = IdempotencyRepository(session)
        async for delivered in consumer.read_batch(count=50, block_ms=100):
            if delivered.event is None:
                await send_to_dlq(
                    redis=redis,
                    consumer_group=FOUNDATION_CONSUMER_GROUP,
                    message_id=delivered.message_id,
                    event_type=delivered.event_type,
                    raw_data=delivered.raw_data,
                    error="unknown event_type",
                )
                await consumer.ack(delivered.message_id)
                continue

            is_first_delivery = await repo.try_mark_processed(
                idempotency_key=delivered.event.idempotency_key,
                consumer_group=FOUNDATION_CONSUMER_GROUP,
                event_type=delivered.event_type,
                raw_event=json.loads(delivered.raw_data),
            )
            if is_first_delivery:
                processed += 1
                logger.info(
                    "event_processed",
                    event_type=delivered.event_type,
                    event_id=str(delivered.event.event_id),
                )
            else:
                logger.info("event_redelivery_skipped", event_type=delivered.event_type)
            await consumer.ack(delivered.message_id)
            await session.commit()

    return processed


GAMIFICATION_CONSUMER_GROUP = "gamification"


async def poll_gamification_events(_ctx: dict[Any, Any], *_args: Any, **_kwargs: Any) -> int:
    """Process the gamification consumer group with transactional idempotency."""
    redis = get_redis_client()
    consumer = EventConsumer(
        group=GAMIFICATION_CONSUMER_GROUP,
        consumer_name="gamification-worker-1",
        redis=redis,
    )
    processed = 0
    async with session_scope() as session:
        repo = IdempotencyRepository(session)
        processor = GamificationEventProcessor(session)
        async for delivered in consumer.read_batch(count=50, block_ms=100):
            if delivered.event is None:
                await send_to_dlq(
                    redis=redis,
                    consumer_group=GAMIFICATION_CONSUMER_GROUP,
                    message_id=delivered.message_id,
                    event_type=delivered.event_type,
                    raw_data=delivered.raw_data,
                    error="unknown event_type",
                )
                await consumer.ack(delivered.message_id)
                continue

            if await repo.try_mark_processed(
                idempotency_key=delivered.event.idempotency_key,
                consumer_group=GAMIFICATION_CONSUMER_GROUP,
                event_type=delivered.event_type,
                raw_event=json.loads(delivered.raw_data),
            ):
                context = await processor.process(delivered.event)
                # Feed the leaderboard projection from the authoritative context — the board
                # is a rebuildable read model, never a source of truth (gamification §5.5).
                if context is not None:
                    user = await UserRepository(session).get_by_id(context.user_id)
                    projection = LeaderboardProjection(redis)
                    await projection.update_user(
                        context, display_name=user.display_name if user else "Learner"
                    )
                    # Slice 07: notify the real-time transport that authoritative state changed.
                    # SSE only says "something changed" — clients refetch the authoritative
                    # APIs. Notifications are best-effort and never fail the pipeline.
                    from gamification.realtime.sse import (
                        publish_leaderboard_updated,
                        publish_progress_updated,
                    )

                    await publish_progress_updated(redis, str(context.user_id))
                    await publish_leaderboard_updated(redis)
                processed += 1
            await consumer.ack(delivered.message_id)
            await session.commit()
    return processed


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    # arq's WorkerCoroutine Protocol doesn't structurally match a plain async def under mypy
    # despite satisfying it at runtime (arq's own examples have the same shape) — third-party
    # stub friction, not a real type error.
    cron_jobs = [
        cron(poll_events, second=set(range(0, 60, 5))),  # type: ignore[arg-type]
        cron(poll_gamification_events, second=set(range(0, 60, 5))),  # type: ignore[arg-type]
    ]
