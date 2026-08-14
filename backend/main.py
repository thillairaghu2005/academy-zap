"""App factory + lifespan (SOP §1.5) — the only place the app is instantiated.

Import order matters: every subsystem's `router.py` self-registers via `register_subsystem` as a
side effect of being imported, so they must all be imported before `build_api_router()` is
called. This is the "written once, never edited when a new subsystem is added" loop from
platform §4.1 — adding a subsystem means adding one import line here, not touching the loop.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter
from prometheus_fastapi_instrumentator import Instrumentator

# Every subsystem's router module — importing triggers `register_subsystem` (see module docstring).
import admin.router  # noqa: F401
import assessments.router  # noqa: F401
import commerce.router  # noqa: F401
import content.router  # noqa: F401
import gamification.router  # noqa: F401
import judge.router  # noqa: F401
import labs.router  # noqa: F401
import notifications.router  # noqa: F401
import search.router  # noqa: F401
from platform_core.core.config import settings
from platform_core.core.exceptions import register_exception_handlers
from platform_core.core.logging import configure_logging
from platform_core.core.middleware.csrf import CookieOriginMiddleware
from platform_core.core.middleware.logging import RequestLoggingMiddleware
from platform_core.core.middleware.request_id import RequestIdMiddleware
from platform_core.core.redis import get_redis_client
from platform_core.core.router import build_api_router


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    configure_logging()
    redis = get_redis_client()
    await FastAPILimiter.init(redis)
    yield
    await FastAPILimiter.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Zapsters API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(CookieOriginMiddleware)

    register_exception_handlers(app)
    app.include_router(build_api_router())

    # SOP §10: /metrics must not be publicly reachable in production without network-level
    # restriction. Actual ingress/firewall scoping is infra work outside this codebase; as a
    # code-level floor, the endpoint is simply not mounted when ENV=production until that infra
    # exists — mount it behind an internal-only route/ingress rule instead of removing this guard.
    if not settings.is_production:
        Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

    return app


app = create_app()
