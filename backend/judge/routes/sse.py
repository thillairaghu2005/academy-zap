import asyncio
import json
import uuid

import structlog
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from platform_core.core.constants import SSE_HEARTBEAT_INTERVAL_SECONDS
from platform_core.core.redis import get_redis_client

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/judge", tags=["judge"])

JUDGE_SSE_CHANNEL_PREFIX = "zapsters:sse:judge:"

async def publish_judge_result(submission_id: uuid.UUID) -> None:
    redis = get_redis_client()
    try:
        await redis.publish(
            f"{JUDGE_SSE_CHANNEL_PREFIX}{submission_id}",
            json.dumps({"type": "judge.result_ready", "submission_id": str(submission_id)})
        )
    except Exception:
        logger.exception("sse publish judge.result_ready failed")

@router.get("/submissions/{submission_id}/stream")
async def judge_submission_stream(submission_id: uuid.UUID) -> StreamingResponse:
    async def event_generator():
        yield "event: connected\ndata: {\"type\":\"connected\"}\n\n"
        
        redis = get_redis_client()
        pubsub = redis.pubsub()
        channel = f"{JUDGE_SSE_CHANNEL_PREFIX}{submission_id}"
        await pubsub.subscribe(channel)
        
        try:
            while True:
                try:
                    message = await asyncio.wait_for(
                        pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0),
                        timeout=SSE_HEARTBEAT_INTERVAL_SECONDS
                    )
                    if message and message["type"] == "message":
                        data_str = message["data"]
                        if isinstance(data_str, (bytes, bytearray)):
                            data_str = data_str.decode("utf-8", errors="replace")
                        yield f"event: result_ready\ndata: {data_str}\n\n"
                        break # Stop streaming once result is ready
                except TimeoutError:
                    yield ": ping\n\n"
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
