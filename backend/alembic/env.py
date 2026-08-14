"""Async Alembic migration environment.

One shared `Base.metadata` across every subsystem (imported below) is what makes autogenerate
diffing reliable; the physical per-subsystem `version_locations` split (alembic.ini) plus branch
labels is what keeps one subsystem's migration history from colliding with another's — see the
plan's assumption register for why this, and not two separate `MetaData` objects, is the chosen
mechanism (Alembic autogenerate needs exactly one `MetaData` to diff against).

`ALEMBIC_SUBSYSTEM` (set only while generating a new revision, never at `upgrade` time) narrows
autogenerate's diff to one subsystem's tables — this is what makes "one
`alembic revision --autogenerate` per subsystem" produce one migration per subsystem instead of
every table landing in whichever migration runs first. Two separate hooks are needed for this:
`include_name` filters names reflected from the live connection (irrelevant here since every
table starts out "added" against an empty database), while `include_object` filters the
metadata-side `Table` objects that drive the "detected added table" direction — that second one
is what actually scopes which CREATE TABLE ops land in a given revision (see
`alembic/autogenerate/compare.py::_compare_tables`, which checks `run_object_filters`, not
`run_name_filters`, for tables present in metadata but absent from the connection).
"""

import asyncio
import os
from logging.config import fileConfig
from typing import Any

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Import every subsystem's models so Base.metadata is fully populated before autogenerate runs.
# (admin, search, notifications own no tables of their own this round — nothing to import.)
import assessments.models  # noqa: F401
import commerce.models  # noqa: F401
import content.models  # noqa: F401
import gamification.models  # noqa: F401
import judge.models  # noqa: F401
import labs.models  # noqa: F401
import platform_core.core.models  # noqa: F401
import platform_core.events.models  # noqa: F401
from alembic import context
from platform_core.core.config import settings
from platform_core.core.db.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Table name -> owning subsystem (platform §4.2). Used only to scope `revision --autogenerate`
# to one subsystem's migration folder at a time; every table still lives in the one shared
# `Base.metadata` at runtime.
TABLE_SUBSYSTEM: dict[str, str] = {
    "user": "core",
    "org": "core",
    "audit_log": "core",
    "processed_event": "platform_events",
    "course": "content",
    "module": "content",
    "lesson": "content",
    "enrollment": "content",
    "lesson_progress": "content",
    "problem": "judge",
    "sample_case": "judge",
    "test_case": "judge",
    "submission": "judge",
    "lab": "labs",
    "lab_objective": "labs",
    "lab_session": "labs",
    "assessment": "assessments",
    "question": "assessments",
    "assessment_submission": "assessments",
    "xp_ledger": "gamification",
    "progress_context_snapshot": "gamification",
    "order": "commerce",
    "subscription": "commerce",
    "invoice": "commerce",
    "entitlement": "commerce",
}

_target_subsystem = os.environ.get("ALEMBIC_SUBSYSTEM")


def include_name(name: str | None, type_: str, parent_names: dict[str, str]) -> bool:
    if _target_subsystem is None or type_ != "table":
        return True
    return TABLE_SUBSYSTEM.get(name or "") == _target_subsystem


def include_object(
    obj: Any, name: str | None, type_: str, reflected: bool, compare_to: Any
) -> bool:
    if _target_subsystem is None or type_ != "table":
        return True
    return TABLE_SUBSYSTEM.get(name or "") == _target_subsystem


def run_migrations_offline() -> None:
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        include_name=include_name,
        include_object=include_object,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def _do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_name=include_name,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(_do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
