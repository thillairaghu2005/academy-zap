"""Labs notebook cell execution queue consumer (Redis Streams + consumer group).

Mirrors the judge worker queue (slice 10 F-10) exactly, on its own stream:
- One consumer group (`labs_worker_group`), one unique consumer name per process.
- New messages via `XREADGROUP >`; interrupted messages recovered via `XAUTOCLAIM` after
  `LABS_RECLAIM_IDLE_MS` idle (worker crash).
- ACK ONLY on success (executed/skipped-terminal). A failure is NEVER acknowledged as success:
  the message stays in the pending list, the execution row is reset to `queued` by the
  executor, and the reclaim redelivers it. Retries are counted per execution in Redis; past
  `LABS_MAX_RETRIES` the message is ACKed (removed from the pending list) and recorded on the
  labs dead-letter stream with the failure reason.
- A periodic reconciliation job (`reconcile_stuck_lab_executions`) recovers rows stranded in
  `processing` by a hard worker kill.
"""

import os
from typing import Any

import structlog

from labs.worker.executor import EXECUTED, SKIPPED, execute_lab_cell
from platform_core.core.config import settings
from platform_core.core.db.session import session_scope
from platform_core.core.redis import get_redis_client

logger = structlog.get_logger(__name__)

LABS_CONSUMER_GROUP = "labs_worker_group"
LABS_QUEUE_STREAM = "zapsters:labs:queue"
LABS_DLQ_STREAM = "zapsters:labs:dlq"
LABS_RETRY_KEY_PREFIX = "labs:retry:"


def _consumer_name() -> str:
    """Unique per process so multiple workers share the group without aliasing."""
    return f"{settings.LABS_WORKER_CONSUMER_NAME}-{os.getpid()}"


async def _ensure_group(redis: Any) -> None:
    try:
        await redis.xgroup_create(LABS_QUEUE_STREAM, LABS_CONSUMER_GROUP, id="0", mkstream=True)
    except Exception as exc:  # noqa: BLE001 - redis ResponseError for existing group
        if "BUSYGROUP" not in str(exc):
            raise


async def _process_message(
    redis: Any, *, message_id: str, execution_id_str: str
) -> bool:
    """Process one delivery. Returns True when it must be ACKed (success or terminal).

    On failure: retry counter is bumped; the message is left un-ACKed for reclaim unless the
    retry cap is exceeded, in which case the execution is failed, the message ACKed, and the
    failure recorded on the DLQ.
    """
    try:
        async with session_scope() as session:
            outcome = await execute_lab_cell(session, execution_id_str)
    except Exception as exc:  # noqa: BLE001 - sandbox/infra failures handled by retry/DLQ
        logger.exception(
            "Cell execution raised",
            execution_id=execution_id_str,
            error=str(exc),
            message_id=message_id,
        )
        return await _handle_failure(redis, message_id, execution_id_str, str(exc))

    if outcome in (EXECUTED, SKIPPED):
        retry_key = f"{LABS_RETRY_KEY_PREFIX}{execution_id_str}"
        await redis.delete(retry_key)
        return True

    logger.error("Unknown worker outcome", execution_id=execution_id_str, outcome=outcome)
    return True


async def _handle_failure(
    redis: Any, message_id: str, execution_id_str: str, error: str
) -> bool:
    """Returns True when the message should be ACKed (retry cap exceeded → DLQ'd)."""
    retry_key = f"{LABS_RETRY_KEY_PREFIX}{execution_id_str}"
    retries = int(await redis.incr(retry_key) or 0)
    if retries > settings.LABS_MAX_RETRIES:
        # Permanent failure: mark the execution `error`, ACK (remove from PEL), record DLQ.
        from labs.repositories.execution import ExecutionRepository

        async with session_scope() as session:
            await ExecutionRepository(session).mark_error(uuid_or_none(execution_id_str), error)
            await session.commit()
        await redis.delete(retry_key)
        await redis.xadd(
            LABS_DLQ_STREAM,
            {
                "execution_id": execution_id_str,
                "original_message_id": message_id,
                "error": error[:2000],
            },
        )
        logger.error(
            "Cell execution failed permanently", execution_id=execution_id_str, error=error
        )
        return True
    # Retry path: leave the message un-ACKed in the pending list; the executor already reset
    # the row to `queued`, so the reclaim (LABS_RECLAIM_IDLE_MS later) reprocesses it.
    logger.warning(
        "Cell execution will retry",
        execution_id=execution_id_str,
        attempt=retries,
        max_retries=settings.LABS_MAX_RETRIES,
    )
    return False


def uuid_or_none(value: str) -> Any:
    import uuid

    try:
        return uuid.UUID(value)
    except (ValueError, TypeError):
        return None


async def _ack(redis: Any, message_id: str) -> None:
    """ACK a processed message. Kept as a tiny wrapper so redis-py's untyped stream commands
    stay out of mypy's no-untyped-call noise (same reason `xack` is called in one place)."""
    await redis.xack(LABS_QUEUE_STREAM, LABS_CONSUMER_GROUP, message_id)


async def poll_labs_queue(ctx: dict[Any, Any], *args: Any, **kwargs: Any) -> int:
    redis = get_redis_client()
    await _ensure_group(redis)
    consumer_name = _consumer_name()

    processed = 0
    # 1) Reclaim messages abandoned by crashed/idle workers (PEL → this consumer).
    claimed = await redis.xautoclaim(
        LABS_QUEUE_STREAM,
        LABS_CONSUMER_GROUP,
        consumer_name,
        min_idle_time=settings.LABS_RECLAIM_IDLE_MS,
        start_id="0-0",
        count=10,
    )
    for message_id, msg_data in (claimed[1] if claimed else []):
        execution_id_str = msg_data.get("execution_id")
        if not execution_id_str:
            await _ack(redis, message_id)
            continue
        ack = await _process_message(
            redis, message_id=message_id, execution_id_str=execution_id_str
        )
        if ack:
            await _ack(redis, message_id)
            processed += 1

    # 2) New messages.
    messages = await redis.xreadgroup(
        groupname=LABS_CONSUMER_GROUP,
        consumername=consumer_name,
        streams={LABS_QUEUE_STREAM: ">"},
        count=10,
        block=100,
    )
    for _stream, msgs in messages or []:
        for message_id, msg_data in msgs:
            execution_id_str = msg_data.get("execution_id")
            if not execution_id_str:
                logger.error("Missing execution_id in labs queue message", message_id=message_id)
                await _ack(redis, message_id)
                continue
            ack = await _process_message(
                redis, message_id=message_id, execution_id_str=execution_id_str
            )
            if ack:
                await _ack(redis, message_id)
                processed += 1

    return processed