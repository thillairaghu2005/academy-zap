"""Dead-letter stream — a message a consumer group could not process after retries lands here
for replay/inspection rather than being silently dropped.
"""

from platform_core.core.redis import AsyncRedis

DLQ_STREAM_KEY = "zapsters:events:dlq"


async def send_to_dlq(
    *,
    redis: AsyncRedis,
    consumer_group: str,
    message_id: str,
    event_type: str,
    raw_data: str,
    error: str,
) -> None:
    await redis.xadd(
        DLQ_STREAM_KEY,
        {
            "consumer_group": consumer_group,
            "original_message_id": message_id,
            "event_type": event_type,
            "data": raw_data,
            "error": error,
        },
    )
