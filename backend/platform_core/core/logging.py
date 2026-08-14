"""structlog configuration (fastapi-backend-sop.md §10).

JSON rendering in production, human-readable console rendering in development — never the
reverse. Passwords, tokens, secrets, full bodies, raw query params, and Authorization/Cookie
headers must never reach a log call; that discipline is enforced at each call site, not here.
"""

import logging
import sys

import structlog

from platform_core.core.config import settings


def configure_logging() -> None:
    # Native structlog processors only — `structlog.stdlib.*` processors (add_logger_name in
    # particular) assume a stdlib-style logger with a `.name` attribute, which `PrintLogger`
    # (below) does not have.
    shared_processors: list[structlog.typing.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if settings.is_production:
        renderer: structlog.typing.Processor = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer()

    structlog.configure(
        processors=[*shared_processors, structlog.processors.format_exc_info, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(sys.stdout),
        cache_logger_on_first_use=True,
    )
