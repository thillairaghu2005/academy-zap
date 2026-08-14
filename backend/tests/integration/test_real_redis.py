"""Real Redis connectivity and stream semantics; Docker Redis is required for this test."""

import uuid

import pytest
from redis.asyncio import Redis

from platform_core.core.config import settings


@pytest.mark.asyncio
async def test_real_redis_ping_and_stream_round_trip() -> None:
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    stream = f"zapsters:test:{uuid.uuid4()}"
    try:
        assert await redis.ping() is True
        message_id = await redis.xadd(stream, {"kind": "connectivity", "value": "ok"})
        messages = await redis.xread({stream: "0-0"}, count=1)
        assert messages[0][1][0][0] == message_id
        assert messages[0][1][0][1]["value"] == "ok"
    finally:
        await redis.delete(stream)
        await redis.close()
