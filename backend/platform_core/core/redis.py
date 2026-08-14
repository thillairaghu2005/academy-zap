"""Shared async Redis client — jti denylist, rate limiting, event bus, idempotency checks."""

from collections.abc import AsyncGenerator
from functools import lru_cache
from typing import TYPE_CHECKING

from redis.asyncio import Redis

from platform_core.core.config import settings

if TYPE_CHECKING:
    # redis-py's `Redis` is only Generic[AnyStr] for type checkers (mypy stubs), not at
    # runtime — `Redis[str]` as an executed expression raises TypeError, so the parametrized
    # alias exists solely behind this guard.
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis


@lru_cache
def get_redis_client() -> "AsyncRedis":
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis() -> AsyncGenerator["AsyncRedis"]:
    yield get_redis_client()
