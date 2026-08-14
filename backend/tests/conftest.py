"""Shared test fixtures (fastapi-backend-sop.md §12).

- `db_session`: a real throwaway Postgres, SAVEPOINT-isolated per test (§12.3, §12.4) — never
  mocked, never SQLite.
- `redis`: fakeredis, per §12 ("integration ... real throwaway Postgres, fakeredis").
- `client`: `httpx.AsyncClient` + `ASGITransport`, with `app.dependency_overrides` swapping the
  real DB/Redis dependencies for the test ones (§12.2) — never monkeypatching internals.
"""

import os
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

import fakeredis  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from pytest_postgresql.janitor import DatabaseJanitor  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402

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
