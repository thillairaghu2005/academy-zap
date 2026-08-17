"""Shared test fixtures (fastapi-backend-sop.md §12).

- `db_session`: a real throwaway Postgres, SAVEPOINT-isolated per test (§12.3, §12.4) — never
  mocked, never SQLite.
- `redis`: fakeredis, per §12 ("integration ... real throwaway Postgres, fakeredis").
- `client`: `httpx.AsyncClient` + `ASGITransport`, with `app.dependency_overrides` swapping the
  real DB/Redis dependencies for the test ones (§12.2) — never monkeypatching internals.
"""

import os
import uuid
from collections.abc import AsyncGenerator, Generator

# SECRET_KEY/DATABASE_URL/REDIS_URL must exist before any module that imports
# platform_core.core.config is imported (Settings validates at import time, SOP §5.2) — set
# defaults here, before the `app` import below, so a bare `pytest` invocation doesn't require a
# hand-authored .env.
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-characters-long")
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://zapsters:zapsters@localhost:5433/zapsters_test"
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6380/0")

from typing import TYPE_CHECKING  # noqa: E402

import fakeredis  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from pytest_postgresql.janitor import DatabaseJanitor  # noqa: E402
from redis.asyncio import Redis  # noqa: E402
from sqlalchemy import Engine  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402

if TYPE_CHECKING:
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis

# Import every subsystem's models so Base.metadata is fully populated for create_all.
import assessments.models  # noqa: E402, F401
import commerce.models  # noqa: E402, F401
import content.models  # noqa: E402, F401
import gamification.models  # noqa: E402, F401
import judge.models  # noqa: E402, F401
import labs.models  # noqa: E402, F401
import platform_core.core.models  # noqa: E402, F401
import platform_core.events.models  # noqa: E402, F401
from main import app  # noqa: E402
from platform_core.core.db.base import Base  # noqa: E402
from platform_core.core.db.session import get_session  # noqa: E402
from platform_core.core.redis import get_redis  # noqa: E402

TEST_DB_HOST = "localhost"
TEST_DB_PORT = 5433
TEST_DB_USER = "zapsters"
TEST_DB_PASSWORD = "zapsters"
TEST_DB_NAME = "zapsters_test"
TEST_DATABASE_URL = f"postgresql+asyncpg://{TEST_DB_USER}:{TEST_DB_PASSWORD}@{TEST_DB_HOST}:{TEST_DB_PORT}/{TEST_DB_NAME}"


@pytest.fixture(scope="session")
def postgres_test_db() -> Generator[str]:
    """Creates a throwaway Postgres database once per test session and builds every subsystem's
    tables in it via `Base.metadata.create_all` — not Alembic, so schema changes are picked up
    immediately without needing a migration to exist yet (the migrations themselves are verified
    separately, per the plan's validation steps 1-3, not by the test suite).
    """
    janitor = DatabaseJanitor(
        user=TEST_DB_USER,
        host=TEST_DB_HOST,
        port=TEST_DB_PORT,
        dbname=TEST_DB_NAME,
        version="16",
        password=TEST_DB_PASSWORD,
    )
    janitor.init()
    try:
        sync_url = (
            f"postgresql+psycopg://{TEST_DB_USER}:{TEST_DB_PASSWORD}@"
            f"{TEST_DB_HOST}:{TEST_DB_PORT}/{TEST_DB_NAME}"
        )
        from sqlalchemy import create_engine

        sync_engine = create_engine(sync_url)
        Base.metadata.create_all(sync_engine)
        _seed_test_badge_definitions(sync_engine)
        _seed_test_league_tiers(sync_engine)
        sync_engine.dispose()
        yield TEST_DATABASE_URL
    finally:
        janitor.drop()


@pytest_asyncio.fixture
async def db_session(postgres_test_db: str) -> AsyncGenerator[AsyncSession]:
    """SAVEPOINT pattern (SOP §12.4): a nested transaction rolled back after each test, so a
    repository's own `session.commit()` calls don't leak rows into the next test.
    """
    engine = create_async_engine(postgres_test_db)
    async with engine.connect() as connection:
        outer_transaction = await connection.begin()
        session = AsyncSession(
            bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        try:
            yield session
        finally:
            await session.close()
            await outer_transaction.rollback()
    await engine.dispose()


@pytest.fixture
def redis() -> fakeredis.FakeAsyncRedis:
    return fakeredis.FakeAsyncRedis(decode_responses=True)


@pytest_asyncio.fixture
async def client(
    db_session: AsyncSession, redis: fakeredis.FakeAsyncRedis
) -> AsyncGenerator[AsyncClient]:
    async def _override_get_session() -> AsyncGenerator[AsyncSession]:
        yield db_session

    async def _override_get_redis() -> AsyncGenerator[fakeredis.FakeAsyncRedis]:
        yield redis

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_redis] = _override_get_redis

    # main.py's `lifespan` (which calls FastAPILimiter.init against the *real* Redis) never
    # runs under ASGITransport without a real server — initialize it directly against the same
    # fakeredis instance the rest of this test uses instead of triggering the full app lifespan.
    from fastapi_limiter import FastAPILimiter

    await FastAPILimiter.init(redis)
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac
    finally:
        await FastAPILimiter.close()
        app.dependency_overrides.clear()


async def register_and_login(
    client: AsyncClient, email: str, *, password: str = "correct-horse-4"
) -> str:
    """Shared across the integration and security tiers — registers a user, logs in, and
    returns a bearer access token, so each test file doesn't reimplement it.
    """
    await client.post(
        "/api/v1/auth/register",
        json={"display_name": "Test User", "email": email, "password": password},
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    access_token: str = login.json()["tokens"]["access_token"]
    return access_token


def _seed_test_badge_definitions(sync_engine: Engine) -> None:
    """The throwaway DB is built with `create_all`, not Alembic, so the badge catalog seed
    (normally applied by the migration `da96596d5d81`) is inserted here from the shared
    `gamification.badge_catalog` module — same rows the migration seeds, so the acceptance
    tier exercises the real definitions.
    """
    from sqlalchemy import insert

    from gamification.badge_catalog import BADGE_DEFINITIONS
    from gamification.models import BadgeDefinition

    with sync_engine.begin() as connection:
        for definition in BADGE_DEFINITIONS:
            connection.execute(
                insert(BadgeDefinition).values(id=uuid.uuid4(), enabled=True, **definition)
            )


def _seed_test_league_tiers(sync_engine: Engine) -> None:
    """The throwaway DB is built with `create_all`, not Alembic, so the league tier catalog
    (normally seeded by the migration `da96596d5d83`) is inserted here — same rows the
    migration seeds.
    """
    from sqlalchemy import insert

    from gamification.models import LeagueTier

    tiers = [
        ("bronze", 1, "Bronze"),
        ("silver", 2, "Silver"),
        ("gold", 3, "Gold"),
        ("platinum", 4, "Platinum"),
        ("obsidian", 5, "Obsidian"),
    ]
    with sync_engine.begin() as connection:
        for index, (tier_id, display_order, name) in enumerate(tiers, start=1):
            connection.execute(
                insert(LeagueTier).values(
                    id=uuid.UUID(f"22222222-2222-4222-8222-00000000000{index}"),
                    tier_id=tier_id,
                    display_order=display_order,
                    name=name,
                )
            )


async def drain_outbox_for_test(
    db_session: AsyncSession, redis: fakeredis.FakeAsyncRedis | AsyncRedis
) -> int:
    """Helper for acceptance tests that bypasses isolation issues by draining outbox rows
    directly from the test's `db_session` (which contains the uncommitted outbox rows) and
    flushing.
    """
    from datetime import UTC, datetime

    from sqlalchemy import select

    from platform_core.bus.producer import publish
    from platform_core.events.models import OutboxEvent
    from platform_core.events.schema import EVENT_TYPE_REGISTRY

    result = await db_session.execute(
        select(OutboxEvent).where(OutboxEvent.dispatched_at.is_(None))
    )
    events = result.scalars().all()
    processed = 0
    for row in events:
        event_cls = EVENT_TYPE_REGISTRY.get(row.event_type)
        if event_cls:
            await publish(event_cls(**row.payload), redis)
        row.dispatched_at = datetime.now(UTC)
        processed += 1
    
    await db_session.flush()
    return processed
