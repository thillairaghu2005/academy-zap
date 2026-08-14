"""Shared declarative base + naming convention (fastapi-backend-sop.md §6.2).

Every subsystem's models.py imports `Base` from here so the whole schema shares one
deterministic naming convention and, for Alembic autogenerate, one MetaData object — the
physical migration-folder split (per subsystem) is what keeps changes from colliding, not a
second MetaData instance (see backend/alembic/env.py).
"""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

POSTGRES_INDEXES_NAMING_CONVENTION = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=POSTGRES_INDEXES_NAMING_CONVENTION)
