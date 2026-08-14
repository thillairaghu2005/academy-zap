"""Redis Streams producer — at-least-once delivery onto one shared stream, fanned out to a
consumer group per subsystem (build.md B1).
"""

from platform_core.core.redis import AsyncRedis
from platform_core.events.schema import BaseEvent

EVENTS_STREAM_KEY = "zapsters:events"


async def publish(event: BaseEvent, redis: AsyncRedis) -> str:
    """XADD the event onto the shared stream. Returns the stream message id."""
    fields = {"event_type": event.event_type, "data": event.model_dump_json()}
    message_id: str = await redis.xadd(EVENTS_STREAM_KEY, fields)
    return message_id
