"""Redis Streams consumer-group wrapper — one group per subsystem, at-least-once delivery.

A subsystem calls `EventConsumer(group="gamification").read_batch()`, processes each event
(checking `platform_core.events.idempotency` before doing anything with side effects), then
`ack()`s it. An event that repeatedly fails processing is pushed to the dead-letter stream by the
caller rather than looped on forever.
"""

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import redis.exceptions

from platform_core.bus.producer import EVENTS_STREAM_KEY
from platform_core.core.redis import AsyncRedis
from platform_core.events.schema import EVENT_TYPE_REGISTRY, BaseEvent

EVENT_RECLAIM_IDLE_MS = 60_000


@dataclass
class DeliveredMessage:
    message_id: str
    event_type: str
    raw_data: str
    event: (
        BaseEvent | None
    )  # None if event_type isn't in the registry — caller's call whether to DLQ


class EventConsumer:
    def __init__(self, *, group: str, consumer_name: str, redis: AsyncRedis) -> None:
        self.group = group
        self.consumer_name = consumer_name
        self._redis = redis

    async def ensure_group(self) -> None:
        try:
            await self._redis.xgroup_create(EVENTS_STREAM_KEY, self.group, id="0", mkstream=True)
        except redis.exceptions.ResponseError as exc:
            if "BUSYGROUP" not in str(exc):
                raise

    async def read_batch(
        self, *, count: int = 10, block_ms: int = 5000
    ) -> AsyncIterator[DeliveredMessage]:
        await self.ensure_group()
        claimed = await self._redis.xautoclaim(
            EVENTS_STREAM_KEY,
            self.group,
            self.consumer_name,
            min_idle_time=EVENT_RECLAIM_IDLE_MS,
            start_id="0-0",
            count=count,
        )
        claimed_messages = claimed[1]
        for message_id, fields in claimed_messages:
            yield self._decode_message(message_id, fields)

        remaining = max(0, count - len(claimed_messages))
        if remaining == 0:
            return

        response: list[Any] = await self._redis.xreadgroup(
            groupname=self.group,
            consumername=self.consumer_name,
            streams={EVENTS_STREAM_KEY: ">"},
            count=remaining,
            block=block_ms,
        )
        for _stream_key, messages in response:
            for message_id, fields in messages:
                yield self._decode_message(message_id, fields)

    @staticmethod
    def _decode_message(message_id: str, fields: dict[str, str]) -> DeliveredMessage:
        event_type = fields.get("event_type", "")
        raw_data = fields.get("data", "{}")
        event_cls = EVENT_TYPE_REGISTRY.get(event_type)
        event = event_cls.model_validate_json(raw_data) if event_cls else None
        return DeliveredMessage(
            message_id=message_id, event_type=event_type, raw_data=raw_data, event=event
        )

    async def ack(self, message_id: str) -> None:
        # redis-py's async stub for xack is itself untyped — third-party gap, not ours.
        await self._redis.xack(EVENTS_STREAM_KEY, self.group, message_id)  # type: ignore[no-untyped-call]
