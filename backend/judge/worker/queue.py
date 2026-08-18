"""Judge submission queue consumer (Redis Streams + consumer group).

Reliability semantics (slice 10 remediation F-10):
- One consumer group (`judge_worker_group`), one unique consumer name per process, so multiple
  worker processes load-balance the stream.
- New messages via `XREADGROUP >`; interrupted messages recovered via `XAUTOCLAIM` after
  `JUDGE_RECLAIM_IDLE_MS` idle (worker crash).
- ACK ONLY on success (graded/skipped-terminal). A failure is NEVER acknowledged as success:
  the message stays in the pending list, the submission row is reset to `queued` by the
  executor, and the reclaim redelivers it. Retries are counted per submission in Redis; past
  `JUDGE_MAX_RETRIES` the message is ACKed (removed from the pending list) and recorded on the
  judge dead-letter stream with the failure reason.
- A periodic reconciliation job (`reconcile_stuck_judge_submissions`) recovers rows stranded in
  `processing` by a hard worker kill.
"""

import os
from typing import Any

import structlog

from judge.worker.executor import GRADED, SKIPPED, grade_submission
from platform_core.core.config import settings
from platform_core.core.db.session import session_scope
from platform_core.core.redis import get_redis_client

logger = structlog.get_logger(__name__)

JUDGE_CONSUMER_GROUP = "judge_worker_group"
JUDGE_QUEUE_STREAM = "zapsters:judge:queue"
JUDGE_DLQ_STREAM = "zapsters:judge:dlq"
JUDGE_RETRY_KEY_PREFIX = "judge:retry:"


def _consumer_name() -> str:
    """Unique per process so multiple workers share the group without aliasing."""
    return f"{settings.JUDGE_WORKER_CONSUMER_NAME}-{os.getpid()}"


async def _ensure_group(redis: Any) -> None:
    try:
        await redis.xgroup_create(JUDGE_QUEUE_STREAM, JUDGE_CONSUMER_GROUP, id="0", mkstream=True)
    except Exception as exc:  # noqa: BLE001 - redis ResponseError for existing group
        if "BUSYGROUP" not in str(exc):
            raise


async def _process_message(
    redis: Any, *, message_id: str, submission_id_str: str
) -> bool:
    """Process one delivery. Returns True when it must be ACKed (success or terminal).

    On failure: retry counter is bumped; the message is left un-ACKed for reclaim unless the
    retry cap is exceeded, in which case the submission is failed, the message ACKed, and the
    failure recorded on the DLQ.
    """
    try:
        async with session_scope() as session:
            outcome = await grade_submission(session, submission_id_str)
    except Exception as exc:  # noqa: BLE001 - sandbox/infra failures handled by retry/DLQ
        logger.exception(
            "Submission grading raised",
            submission_id=submission_id_str,
            error=str(exc),
            message_id=message_id,
        )
        return await _handle_failure(redis, message_id, submission_id_str, str(exc))

    if outcome in (GRADED, SKIPPED):
        retry_key = f"{JUDGE_RETRY_KEY_PREFIX}{submission_id_str}"
        await redis.delete(retry_key)
        return True

    logger.error("Unknown worker outcome", submission_id=submission_id_str, outcome=outcome)
    return True


async def _handle_failure(
    redis: Any, message_id: str, submission_id_str: str, error: str
) -> bool:
    """Returns True when the message should be ACKed (retry cap exceeded → DLQ'd)."""
    retry_key = f"{JUDGE_RETRY_KEY_PREFIX}{submission_id_str}"
    retries = int(await redis.incr(retry_key) or 0)
    if retries > settings.JUDGE_MAX_RETRIES:
        # Permanent failure: mark the submission `error`, ACK (remove from PEL), record DLQ.
        from judge.repositories.submission import SubmissionRepository

        async with session_scope() as session:
            await SubmissionRepository(session).mark_error(uuid_or_none(submission_id_str), error)
            await session.commit()
        await redis.delete(retry_key)
        await redis.xadd(
            JUDGE_DLQ_STREAM,
            {
                "submission_id": submission_id_str,
                "original_message_id": message_id,
                "error": error[:2000],
            },
        )
        logger.error("Submission failed permanently", submission_id=submission_id_str, error=error)
        return True
    # Retry path: leave the message un-ACKed in the pending list; the executor already reset the
    # row to `queued`, so the reclaim (JUDGE_RECLAIM_IDLE_MS later) reprocesses it.
    logger.warning(
        "Submission will retry",
        submission_id=submission_id_str,
        attempt=retries,
        max_retries=settings.JUDGE_MAX_RETRIES,
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
    await redis.xack(JUDGE_QUEUE_STREAM, JUDGE_CONSUMER_GROUP, message_id)


async def poll_judge_queue(ctx: dict[Any, Any], *args: Any, **kwargs: Any) -> int:
    redis = get_redis_client()
    await _ensure_group(redis)
    consumer_name = _consumer_name()

    processed = 0
    # 1) Reclaim messages abandoned by crashed/idle workers (PEL → this consumer).
    claimed = await redis.xautoclaim(
        JUDGE_QUEUE_STREAM,
        JUDGE_CONSUMER_GROUP,
        consumer_name,
        min_idle_time=settings.JUDGE_RECLAIM_IDLE_MS,
        start_id="0-0",
        count=10,
    )
    for message_id, msg_data in (claimed[1] if claimed else []):
        submission_id_str = msg_data.get("submission_id")
        if not submission_id_str:
            await _ack(redis, message_id)
            continue
        ack = await _process_message(
            redis, message_id=message_id, submission_id_str=submission_id_str
        )
        if ack:
            await _ack(redis, message_id)
            processed += 1

    # 2) New messages.
    messages = await redis.xreadgroup(
        groupname=JUDGE_CONSUMER_GROUP,
        consumername=consumer_name,
        streams={JUDGE_QUEUE_STREAM: ">"},
        count=10,
        block=100,
    )
    for _stream, msgs in messages or []:
        for message_id, msg_data in msgs:
            submission_id_str = msg_data.get("submission_id")
            if not submission_id_str:
                logger.error("Missing submission_id in judge queue message", message_id=message_id)
                await _ack(redis, message_id)
                continue
            ack = await _process_message(
                redis, message_id=message_id, submission_id_str=submission_id_str
            )
            if ack:
                await _ack(redis, message_id)
                processed += 1

    return processed
