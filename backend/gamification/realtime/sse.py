"""SSE connection manager (slice 07).

One `asyncio.Queue` per open client stream; a single Redis pub/sub listener task subscribes
once to the private user pattern AND the public leaderboard channel, then fans each published
notification out to the queues of the authorized clients. This keeps the broadcast channel to
one Redis subscription regardless of client count while per-user channels match the pattern.

Connection lifecycle:
- `attach(redis)` — called by each HTTP stream: registers the client queue and ensures the
  pub/sub listener is running for THAT redis instance. A refcount per redis keeps the listener
  alive while at least one stream is open and stops it when the last one disconnects.
- `detach(redis)` — removes the queue; a disconnected browser releases its queue immediately
  and, when the last client for that redis leaves, the listener task is cancelled.
- Heartbeat: the stream generator sends an SSE comment (`: ping`) every
  `SSE_HEARTBEAT_INTERVAL_SECONDS` via a timeout race with the queue — no per-connection timer
  task to clean up.

Failure behavior: if Redis is unavailable the listener task exits with the error logged — the
HTTP stream still serves heartbeats, and the rest of the API remains usable. SSE is an
enhancement to read freshness, never a rendering dependency.
"""

import asyncio
import json
import logging
from collections import defaultdict
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING, Any

from platform_core.core.constants import (
    SSE_HEARTBEAT_INTERVAL_SECONDS,
    SSE_LEADERBOARD_CHANNEL,
    SSE_TICKET_KEY_PREFIX,
    SSE_TICKET_TTL_SECONDS,
    SSE_USER_CHANNEL_PREFIX,
)

if TYPE_CHECKING:
    from redis.asyncio import Redis

    AsyncRedis = Redis[str]
else:
    from redis.asyncio import Redis as AsyncRedis

logger = logging.getLogger(__name__)

# Client-facing SSE event types — the small explicit transport envelope (slice 07 §3).
PROGRESS_UPDATED = "progress.updated"
LEADERBOARD_UPDATED = "leaderboard.updated"


def leaderboard_channel() -> str:
    return SSE_LEADERBOARD_CHANNEL


def _sse_payload(event_type: str, *, data: dict[str, Any] | None = None) -> str:
    """Serialize one SSE data frame. The transport envelope only ever says WHAT changed —
    never the changed values (the client refetches the authoritative API)."""
    payload: dict[str, Any] = {"type": event_type}
    if data:
        payload.update(data)
    return json.dumps(payload, separators=(",", ":"))


class SseConnectionManager:
    """Fan-out hub: Redis pub/sub listener -> per-client asyncio queues -> HTTP streams."""

    def __init__(self) -> None:
        self._queues: dict[str, set[asyncio.Queue[str]]] = defaultdict(set)
        self._listeners: dict[int, asyncio.Task[None]] = {}
        self._listener_redis: dict[int, AsyncRedis] = {}
        self._refcounts: dict[int, int] = defaultdict(int)
        self._ready: dict[int, asyncio.Future[None]] = {}

    # -- registration -----------------------------------------------------------

    async def attach(self, redis: AsyncRedis, user_id: str) -> asyncio.Queue[str]:
        """Register one stream for `user_id` and ensure a listener for this redis instance.
        Returns only once the listener has subscribed, so no notification published after the
        stream opens can be missed (SSE is at-least-once freshness, but the very first frame
        matters for the client's initial invalidation)."""
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=64)
        self._queues[user_id].add(queue)
        key = id(redis)
        self._refcounts[key] += 1
        await self._ensure_listener(redis, key)
        ready = self._ready.get(key)
        if ready is not None:
            await ready
        return queue

    def detach(self, redis: AsyncRedis, user_id: str, queue: asyncio.Queue[str]) -> None:
        self._queues.get(user_id, set()).discard(queue)
        if not self._queues.get(user_id):
            self._queues.pop(user_id, None)
        key = id(redis)
        if key in self._refcounts:
            self._refcounts[key] -= 1
            if self._refcounts[key] <= 0:
                self._refcounts.pop(key, None)
                self._maybe_stop_listener(key)

    # -- lifecycle --------------------------------------------------------------

    async def _ensure_listener(self, redis: AsyncRedis, key: int) -> None:
        task = self._listeners.get(key)
        if task is not None and not task.done():
            return
        self._listener_redis[key] = redis
        self._ready[key] = asyncio.get_running_loop().create_future()
        self._listeners[key] = asyncio.create_task(self._listen(redis, key))

    def _maybe_stop_listener(self, key: int) -> None:
        if key in self._refcounts:
            return
        task = self._listeners.pop(key, None)
        self._listener_redis.pop(key, None)
        if task is not None:
            task.cancel()

    async def stop(self) -> None:
        for task in self._listeners.values():
            task.cancel()
        self._listeners.clear()
        self._listener_redis.clear()
        self._queues.clear()

    async def _listen(self, redis: AsyncRedis, key: int) -> None:
        """One pattern subscription for ALL user channels + one exact leaderboard channel;
        fan out to authorized queues. New users match the `user:*` pattern automatically, so
        no per-connection (re)subscription is needed."""
        pubsub = redis.pubsub()
        try:
            await pubsub.psubscribe("zapsters:sse:user:*")
            await pubsub.subscribe(leaderboard_channel())
        except Exception as exc:  # noqa: BLE001 - Redis down must not take the API down
            logger.exception("sse pub/sub subscribe failed (Redis unavailable?)")
            ready = self._ready.get(key)
            if ready is not None and not ready.done():
                ready.set_exception(exc)
            return
        ready = self._ready.pop(key, None)
        if ready is not None and not ready.done():
            ready.set_result(None)

        try:
            async for message in pubsub.listen():
                if message.get("type") not in ("pmessage", "message"):
                    continue
                channel = str(message.get("channel", ""))
                data = message.get("data")
                if isinstance(data, (bytes, bytearray)):
                    data = data.decode("utf-8", errors="replace")
                if not isinstance(data, str):
                    continue
                if channel == leaderboard_channel():
                    await self._broadcast_to_all(data)
                elif channel.startswith(SSE_USER_CHANNEL_PREFIX):
                    user_id = channel[len(SSE_USER_CHANNEL_PREFIX) :]
                    await self._broadcast_to_user(user_id, data)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 - stream error logged, listener exits
            logger.exception("sse pub/sub listener error")
        finally:
            try:
                await pubsub.punsubscribe("zapsters:sse:user:*")
                await pubsub.unsubscribe()
                await pubsub.aclose()  # type: ignore[attr-defined]
            except Exception:  # noqa: BLE001
                pass
            if self._listeners.get(key) is asyncio.current_task():
                self._listeners.pop(key, None)
                self._listener_redis.pop(key, None)
                ready = self._ready.pop(key, None)
                if ready is not None and not ready.done():
                    ready.set_exception(
                        RuntimeError("sse listener stopped before subscribing")
                    )

    async def _broadcast_to_all(self, payload: str) -> None:
        for queue_set in list(self._queues.values()):
            for queue in list(queue_set):
                self._offer(queue, payload)

    async def _broadcast_to_user(self, user_id: str, payload: str) -> None:
        for queue in list(self._queues.get(user_id, set())):
            self._offer(queue, payload)

    @staticmethod
    def _offer(queue: asyncio.Queue[str], payload: str) -> None:
        """Best-effort enqueue: a slow client drops the notification rather than blocking the
        fan-out (the authoritative API is one refetch away)."""
        try:
            queue.put_nowait(payload)
        except asyncio.QueueFull:
            try:
                queue.get_nowait()
                queue.put_nowait(payload)
            except (asyncio.QueueEmpty, asyncio.QueueFull):
                pass


def heartbeat_interval_seconds() -> int:
    """Read at stream time so tests can monkeypatch the constant to a small value."""
    return SSE_HEARTBEAT_INTERVAL_SECONDS


async def event_stream_generator(
    queue: asyncio.Queue[str], heartbeat_seconds: float = SSE_HEARTBEAT_INTERVAL_SECONDS
) -> AsyncGenerator[str, None]:
    """The SSE body generator: a `connected` frame, then notification frames from the queue or
    a `: ping` heartbeat comment on idle. Heartbeat is a timeout race with the queue — no
    per-connection timer task. Used by the route so tests can drive it with a plain queue
    (httpx's ASGITransport buffers infinite bodies, so the real HTTP stream is covered by the
    live acceptance tier instead)."""
    yield f"event: connected\ndata: {_sse_payload('connected')}\n\n"
    while True:
        try:
            payload = await asyncio.wait_for(queue.get(), timeout=heartbeat_seconds)
            event_type = _event_type_for(payload)
            yield f"event: {event_type}\ndata: {payload}\n\n"
        except TimeoutError:
            yield ": ping\n\n"


def _event_type_for(payload: str) -> str:
    """Map an internal pub/sub payload to the client-facing SSE event name. Unknown or
    malformed payloads default to a generic `update` rather than a dropped frame."""
    try:
        data = json.loads(payload)
    except (ValueError, TypeError):
        return "update"
    event_type = data.get("type")
    if isinstance(event_type, str) and event_type in (
        PROGRESS_UPDATED,
        LEADERBOARD_UPDATED,
        "connected",
    ):
        return event_type
    return "update"


async def publish_progress_updated(redis: AsyncRedis, user_id: str) -> None:
    """Notify the user's private stream that their ProgressContext changed. Payload carries NO
    values — the frontend invalidates and refetches GET /me/progress (slice 07 §11)."""
    try:
        await redis.publish(f"{SSE_USER_CHANNEL_PREFIX}{user_id}", _sse_payload(PROGRESS_UPDATED))
    except Exception:  # noqa: BLE001 - a notification must never fail the event pipeline
        logger.exception("sse publish progress.updated failed")


async def publish_leaderboard_updated(redis: AsyncRedis) -> None:
    """Broadcast "the board changed" to every connected client. The payload contains NO private
    data (no XP, no integrity flags, no org metadata) — clients refetch the public board API
    (slice 07 §10, §15)."""
    try:
        await redis.publish(
            leaderboard_channel(), _sse_payload(LEADERBOARD_UPDATED, data={"scope": "global"})
        )
    except Exception:  # noqa: BLE001 - a notification must never fail the event pipeline
        logger.exception("sse publish leaderboard.updated failed")


class SseTicketService:
    """Short-lived single-use SSE tickets (slice 07 §4).

    EventSource cannot set an Authorization header, and the refresh cookie is path-scoped to
    /api/v1/auth, so a browser cannot open a private stream with its long-lived credentials.
    Instead the frontend exchanges its access token (via the normal authenticated API client)
    for a one-time ticket stored in Redis with a short TTL. The ticket appears in the SSE URL
    for at most `SSE_TICKET_TTL_SECONDS` seconds and is consumed (deleted) on first use — it
    is NOT the access token and cannot be replayed.
    """

    async def issue(self, redis: AsyncRedis, user_id: str) -> str:
        import secrets

        ticket = secrets.token_urlsafe(32)
        await redis.set(
            f"{SSE_TICKET_KEY_PREFIX}{ticket}",
            user_id,
            ex=SSE_TICKET_TTL_SECONDS,
        )
        return ticket

    async def consume(self, redis: AsyncRedis, ticket: str) -> str | None:
        """Single-use: GETDEL removes the key atomically, so a replayed ticket is rejected."""
        user_id = await redis.getdel(f"{SSE_TICKET_KEY_PREFIX}{ticket}")
        return user_id if isinstance(user_id, str) else None


sse_manager = SseConnectionManager()
sse_tickets = SseTicketService()
