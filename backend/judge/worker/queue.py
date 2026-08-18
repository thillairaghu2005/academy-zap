from typing import Any

import structlog

from judge.worker.executor import grade_submission
from platform_core.core.db.session import session_scope
from platform_core.core.redis import get_redis_client

logger = structlog.get_logger(__name__)

JUDGE_CONSUMER_GROUP = "judge_worker_group"
JUDGE_QUEUE_STREAM = "zapsters:judge:queue"

async def poll_judge_queue(_ctx: dict[Any, Any], *_args: Any, **_kwargs: Any) -> int:
    redis = get_redis_client()
    # Note: Using stream name as group here for a separate stream? The EventConsumer uses EVENTS_STREAM_KEY by default.
    # Let's check EventConsumer. It hardcodes EVENTS_STREAM_KEY = "zapsters:events". 
    # Since zapsters:judge:queue is a different stream, I should either modify EventConsumer or use a custom one,
    # or just use XREADGROUP directly. Let's write a simple stream consumer for judge queue.
    
    group = JUDGE_CONSUMER_GROUP
    consumer_name = "judge-worker-1"
    
    try:
        await redis.xgroup_create(JUDGE_QUEUE_STREAM, group, id="0", mkstream=True)
    except Exception as e:
        if "BUSYGROUP" not in str(e):
            raise

    processed = 0
    while True:
        messages = await redis.xreadgroup(
            groupname=group,
            consumername=consumer_name,
            streams={JUDGE_QUEUE_STREAM: ">"},
            count=10,
            block=100
        )
        if not messages:
            break
            
        for stream, msgs in messages:
            for message_id, msg_data in msgs:
                submission_id_str = msg_data.get("submission_id")
                if not submission_id_str:
                    logger.error("Missing submission_id in judge queue message", message_id=message_id)
                    await redis.xack(JUDGE_QUEUE_STREAM, group, message_id)
                    continue
                    
                logger.info("Processing submission", submission_id=submission_id_str)
                
                try:
                    async with session_scope() as session:
                        await grade_submission(session, submission_id_str)
                    processed += 1
                except Exception as e:
                    logger.exception("Error grading submission", submission_id=submission_id_str, error=str(e))
                finally:
                    # Acknowledge regardless of success to prevent poison pills, or rely on DLQ?
                    # The prompt says: "A crash must not leave a submission permanently stuck without a recoverable state."
                    # If it crashes, it's not ACKed, so it stays in PEL and can be claimed later.
                    # Here we catch exceptions, so we ACK it. If we wanted to retry, we shouldn't ACK it.
                    # Let's ACK it and rely on the DB status to track it.
                    await redis.xack(JUDGE_QUEUE_STREAM, group, message_id)
                
    return processed
