"""Labs -> Gamification acceptance (B6): the `lab.session_completed` event that the notebook
completion gate outboxes is published onto the real event stream and processed by the real
worker into an XP ledger entry — never written directly by the labs subsystem.

Proves the Slice 11 server-authoritative XP path end to end, mirroring the assessment/course
acceptance tiers:
  1. `LabSessionCompletedEvent` -> real Redis Streams -> real `poll_gamification_events` ->
     atomic idempotency marker -> Integrity Gate -> hash-chained ledger (reason `LAB_COMPLETE`,
     source `lab`).
  2. Replaying the same event (same idempotency key) awards nothing — no double XP.
  3. A second completion of the SAME lab (different key) is capped at `LAB_COMPLETION_XP`
     total per lab (the slice 09 course-completion cap pattern).
  4. The resolved ProgressContext reflects the authoritative ledger.

Redis is the real server; Postgres is the real throwaway database. The worker's session/redis
wiring is redirected to the test instances exactly as the slice 04 acceptance tier does.
"""

import uuid
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

import pytest
import pytest_asyncio
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

if TYPE_CHECKING:
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis

from gamification.context.resolver import ProgressContextResolver
from gamification.repositories.ledger import LedgerRepository
from gamification.rules import LAB_COMPLETION_XP
from platform_core.bus.producer import EVENTS_STREAM_KEY, publish
from platform_core.bus.worker import poll_gamification_events
from platform_core.core.config import settings
from platform_core.events.schema import LabSessionCompletedEvent

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def real_redis() -> AsyncGenerator[AsyncRedis, None]:
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    await redis.delete(EVENTS_STREAM_KEY)
    try:
        yield redis
    finally:
        await redis.delete(EVENTS_STREAM_KEY)
        await redis.close()


async def _drain_until_ledger_entry(
    *,
    user_id: uuid.UUID,
    postgres_test_db: str,
    redis: AsyncRedis,
    monkeypatch: pytest.MonkeyPatch,
    max_polls: int = 25,
    expected_count: int = 1,
) -> int:
    """Runs the real worker until this user's ledger entry exists (bounded). Assertions are
    always scoped to `user_id`, so events from other runs on the shared stream don't matter.

    The module-level `get_redis_client` is lru-cached and `session_scope`'s engine pools
    asyncpg connections, both of which would otherwise bind to the first test's event loop — a
    fresh engine per call keeps every connection on the current test's loop.
    """
    from contextlib import asynccontextmanager

    from sqlalchemy.ext.asyncio import async_sessionmaker

    import platform_core.bus.worker as worker_module

    engine = create_async_engine(postgres_test_db)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    @asynccontextmanager
    async def _test_session_scope() -> AsyncGenerator[AsyncSession]:
        async with factory() as session:
            yield session

    monkeypatch.setattr(worker_module, "get_redis_client", lambda: redis)
    monkeypatch.setattr(worker_module, "session_scope", _test_session_scope)

    try:
        for _ in range(max_polls):
            await poll_gamification_events({})
            async with factory() as session:
                entries = await LedgerRepository(session).list_for_user(user_id)
                if len(entries) >= expected_count:
                    return len(entries)
        return 0
    finally:
        await engine.dispose()


def _lab_completed_event(
    *,
    user_id: uuid.UUID,
    lab_id: uuid.UUID,
    progress_id: uuid.UUID,
    idempotency_key: str,
) -> LabSessionCompletedEvent:
    return LabSessionCompletedEvent(
        user_id=user_id,
        org_id=None,
        idempotency_key=idempotency_key,
        session_fingerprint=f"auth:{user_id}",
        lab_id=lab_id,
        session_id=progress_id,
        objectives_completed=["hello-world", "loops"],
        time_taken_seconds=120,
        hints_used=0,
    )


async def test_lab_completion_event_awards_lab_xp_once(
    db_session: AsyncSession,
    postgres_test_db: str,
    real_redis: AsyncRedis,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The outboxed `lab.session_completed` event flows through the real pipeline into exactly
    one hash-chained ledger entry; replaying it awards nothing and the per-lab cap holds."""
    user_id = uuid.uuid4()
    lab_id = uuid.uuid4()
    progress_id = uuid.uuid4()
    key = f"lab:{progress_id}"

    event = _lab_completed_event(
        user_id=user_id,
        lab_id=lab_id,
        progress_id=progress_id,
        idempotency_key=key,
    )
    await publish(event, real_redis)

    entry_count = await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
    )
    assert entry_count == 1

    entries = await LedgerRepository(db_session).list_for_user(user_id)
    assert len(entries) == 1
    awarded = entries[0]
    assert awarded.xp_delta == LAB_COMPLETION_XP
    assert awarded.xp_type == "completion"
    assert awarded.reason_code == "LAB_COMPLETE"
    assert awarded.integrity_status == "verified"
    assert awarded.source_type == "lab"
    assert awarded.source_id == lab_id
    assert awarded.event_id is not None
    await LedgerRepository(db_session).verify_chain_for_user(user_id)

    context = await ProgressContextResolver(db_session).resolve(user_id)
    assert context.rank.completion_xp == LAB_COMPLETION_XP
    assert context.context_version >= 1

    # Replay the exact event (crash/redelivery) -> the idempotency marker short-circuits: zero
    # additional XP, no new ledger row.
    await publish(event, real_redis)
    await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
        expected_count=1,
    )
    entries_after = await LedgerRepository(db_session).list_for_user(user_id)
    assert len(entries_after) == 1
    assert entries_after[0].xp_delta == LAB_COMPLETION_XP

    # A DIFFERENT completion of the SAME lab (fresh idempotency key) hits the per-lab cap: the
    # entry still appends (auditability) but carries zero XP.
    second = _lab_completed_event(
        user_id=user_id,
        lab_id=lab_id,
        progress_id=progress_id,
        idempotency_key=f"lab:{uuid.uuid4()}",
    )
    await publish(second, real_redis)
    await _drain_until_ledger_entry(
        user_id=user_id,
        postgres_test_db=postgres_test_db,
        redis=real_redis,
        monkeypatch=monkeypatch,
        expected_count=2,
    )
    entries_capped = await LedgerRepository(db_session).list_for_user(user_id)
    assert len(entries_capped) == 2
    assert entries_capped[0].xp_delta == LAB_COMPLETION_XP
    assert entries_capped[1].xp_delta == 0
    assert entries_capped[1].reason_code == "LAB_COMPLETE"

    context_after = await ProgressContextResolver(db_session).resolve(user_id)
    assert context_after.rank.completion_xp == LAB_COMPLETION_XP