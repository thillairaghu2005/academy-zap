"""Runnable Arq worker entrypoint for the Judge pipeline (slice 10 remediation F-9).

The `WorkerSettings` class previously existed but nothing ever launched it — a deployment had
no process consuming `zapsters:judge:queue`. This module is that missing entrypoint:

- `python -m judge.worker.entrypoint` — runs the judge worker (queue polling, outbox dispatch,
  stuck-submission reconciliation) as a long-lived process with an asyncio health server.
- `python -m judge.worker.entrypoint --once` — runs every job once and exits (CI smoke / tests).
- `python -m judge.worker.entrypoint --health-port 9099` — override the health endpoint port.

Readiness: arq maintains `health_check_key` in Redis every `health_check_interval`, and the
process additionally serves `GET /healthz` returning JSON with the judge queue depth (XLEN) and
pending-message count for the consumer group, so an orchestrator can probe a real signal
instead of a bare process liveness.
"""

import argparse
import asyncio
import json
import signal
from typing import Any

import structlog
from arq import cron
from arq.connections import RedisSettings
from arq.worker import Worker

from judge.worker.executor import reconcile_stuck_judge_submissions
from judge.worker.queue import JUDGE_CONSUMER_GROUP, JUDGE_QUEUE_STREAM, poll_judge_queue
from platform_core.bus.worker import poll_outbox_events
from platform_core.core.config import settings
from platform_core.core.redis import get_redis_client

logger = structlog.get_logger(__name__)

JUDGE_HEALTH_KEY = "zapsters:worker:judge:health"
DEFAULT_HEALTH_PORT = 9099


def build_judge_worker(*, burst: bool = False) -> Worker:
    return Worker(
        cron_jobs=[
            cron(poll_judge_queue, second=set(range(0, 60, 5))),
            cron(poll_outbox_events, second=set(range(0, 60, 5))),
            cron(reconcile_stuck_judge_submissions, second=set(range(0, 60, 30))),
        ],
        redis_settings=RedisSettings.from_dsn(settings.REDIS_URL),
        burst=burst,
        max_jobs=4,
        job_timeout=300,
        max_tries=1,  # retries are owned by the queue layer (F-10), not arq
        health_check_key=JUDGE_HEALTH_KEY,
        health_check_interval=10,
        handle_signals=False,
    )


async def _healthz(_reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    redis = get_redis_client()
    depth = 0
    pending = 0
    try:
        depth = int(await redis.xlen(JUDGE_QUEUE_STREAM) or 0)
        pel = await redis.xpending(JUDGE_QUEUE_STREAM, JUDGE_CONSUMER_GROUP)  # type: ignore[no-untyped-call]
        pending = int(pel[1]) if pel and len(pel) > 1 else 0
    except Exception:  # noqa: BLE001 - health endpoint must never crash on Redis hiccups
        logger.exception("healthz redis probe failed")
    body = json.dumps(
        {"status": "ok", "queue_depth": depth, "pending_messages": pending}
    ).encode()
    writer.write(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n"
                 b"Content-Length: " + str(len(body)).encode() + b"\r\n\r\n" + body)
    await writer.drain()
    writer.close()
    await writer.wait_closed()


async def _run_health_server(port: int) -> None:
    server = await asyncio.start_server(_healthz, "127.0.0.1", port)
    logger.info("judge worker health server started", port=port)
    async with server:
        await server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Zapsters Judge Arq worker")
    parser.add_argument("--once", action="store_true", help="run every job once, then exit")
    parser.add_argument("--health-port", type=int, default=DEFAULT_HEALTH_PORT)
    args = parser.parse_args()

    async def _run() -> None:
        worker = build_judge_worker(burst=args.once)
        if args.once:
            await worker.async_run()
            return
        # Graceful shutdown on SIGINT/SIGTERM (Kubernetes terminationGracePeriodSeconds).
        stop_event = asyncio.Event()

        def _stop(_sig: Any, _frame: Any) -> None:
            stop_event.set()

        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, _stop, sig, None)
            except NotImplementedError:
                pass  # Windows: signal handlers via loop not supported — OS default applies

        health_task = asyncio.create_task(_run_health_server(args.health_port))
        worker_task = asyncio.create_task(worker.async_run())
        logger.info(
            "judge worker started", health_port=args.health_port, pid=__import__("os").getpid()
        )
        done, _ = await asyncio.wait(
            {worker_task, health_task}, return_when=asyncio.FIRST_COMPLETED
        )
        if worker_task in done and not stop_event.is_set():
            logger.error("worker exited unexpectedly")
            if health_task:
                health_task.cancel()
            raise SystemExit(1)
        if stop_event.is_set():
            logger.info("shutdown requested")
            worker_task.cancel()
            health_task.cancel()
            for task in (worker_task, health_task):
                try:
                    await task
                except (asyncio.CancelledError, Exception):  # noqa: BLE001
                    pass

    asyncio.run(_run())


if __name__ == "__main__":
    main()
