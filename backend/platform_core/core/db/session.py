"""Async engine + session factory. SQLAlchemy 2.0 async API only (AsyncSession)."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from platform_core.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True, echo=False)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession]:
    async with async_session_factory() as session:
        yield session


@asynccontextmanager
async def session_scope() -> AsyncGenerator[AsyncSession]:
    """For use outside a request context (Arq workers, scripts)."""
    async with async_session_factory() as session:
        yield session
