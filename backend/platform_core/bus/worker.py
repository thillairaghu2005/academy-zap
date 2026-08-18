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
from judge.worker.queue import poll_judge_queue
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
            await session.commit()
            await consumer.ack(delivered.message_id)

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

            context = None
            awarded_badges: list[Any] = []
            xp_delta: int | None = None
            if await repo.try_mark_processed(
                idempotency_key=delivered.event.idempotency_key,
                consumer_group=GAMIFICATION_CONSUMER_GROUP,
                event_type=delivered.event_type,
                raw_event=json.loads(delivered.raw_data),
            ):
                result = await processor.process(delivered.event)
                context = result.context
                awarded_badges = result.awarded_badges
                xp_delta = result.xp_delta
                processed += 1
            else:
                # Redelivery path: ledger and context are already committed,
                # but projection might have failed
                from gamification.context.schema import ProgressContext
                from gamification.repositories.context import ContextRepository
                snapshot = await ContextRepository(session).get_latest(delivered.event.user_id)
                if snapshot:
                    context = ProgressContext(
                        user_id=snapshot.user_id,
                        context_version=snapshot.context_version,
                        computed_at=snapshot.computed_at,
                        rank=snapshot.rank,
                        streak=snapshot.streak,
                        league=snapshot.league,
                        guild=snapshot.guild,
                        unresolved_flags=snapshot.unresolved_flags,
                        freeze_status=snapshot.freeze_status,
                    )
            if context is not None:
                user = await UserRepository(session).get_by_id(context.user_id)
                projection = LeaderboardProjection(redis)
                await projection.update_user(
                    context, display_name=user.display_name if user else "Learner"
                )
                league_touched = False
                if xp_delta is not None:
                    from gamification.services.seasons import SeasonService

                    await SeasonService(session).apply_event_delta(
                        user_id=context.user_id,
                        xp_delta=xp_delta,
                        occurred_at=delivered.event.occurred_at,
                        redis=redis,
                    )
                    league_touched = True
                from gamification.realtime.sse import (
                    publish_badges_updated,
                    publish_leaderboard_updated,
                    publish_league_updated,
                    publish_progress_updated,
                )

                await publish_progress_updated(redis, str(context.user_id))
                await publish_leaderboard_updated(redis)
                if league_touched:
                    await publish_league_updated(redis)
            if awarded_badges:
                from gamification.realtime.sse import publish_badges_updated

                await publish_badges_updated(redis, str(delivered.event.user_id))
            await session.commit()
            await consumer.ack(delivered.message_id)
    return processed


async def poll_outbox_events(ctx: dict[Any, Any], *args: Any, **kwargs: Any) -> int:
    from datetime import UTC, datetime

    from sqlalchemy import select

    from platform_core.bus.producer import publish
    from platform_core.events.models import OutboxEvent
    from platform_core.events.schema import EVENT_TYPE_REGISTRY

    redis = get_redis_client()
    processed = 0
    async with session_scope() as session:
        result = await session.execute(
            select(OutboxEvent)
            .where(OutboxEvent.dispatched_at.is_(None))
            .order_by(OutboxEvent.created_at)
            .limit(50)
            .with_for_update(skip_locked=True)
        )
        events = result.scalars().all()
        for row in events:
            event_cls = EVENT_TYPE_REGISTRY.get(row.event_type)
            if event_cls:
                event_obj = event_cls(**row.payload)
                await publish(event_obj, redis)
            else:
                # Unknown event types are never published — route them to the dead-letter
                # stream (same contract the stream consumers apply to unknown types) instead
                # of silently swallowing them, then mark dispatched so they are not retried
                # forever.
                await send_to_dlq(
                    redis=redis,
                    consumer_group="outbox",
                    message_id=str(row.id),
                    event_type=row.event_type,
                    raw_data=json.dumps(row.payload, default=str),
                    error="unknown event_type",
                )

            row.dispatched_at = datetime.now(UTC)
            processed += 1

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
        cron(poll_outbox_events, second=set(range(0, 60, 5))),
        cron(poll_judge_queue, second=set(range(0, 60, 5))),
    ]
