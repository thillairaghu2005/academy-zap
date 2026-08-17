"""Gamification tables: `xp_ledger` (append-only, hash-chained; converted to a TimescaleDB
hypertable partitioned by `created_at` in its Alembic migration — see
`alembic/versions/gamification/`) and `progress_context_snapshot` (append-only, one row per
`context_version`; see the assumption register in the backend README / plan for why this table
exists even though §5.3 doesn't name storage for it explicitly).
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ARRAY, DateTime, Float, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from platform_core.core.db.base import Base


class LedgerEntry(Base):
    __tablename__ = "xp_ledger"

    # TimescaleDB requires the partitioning column in every unique/primary-key constraint, so
    # the PK is composite (id, created_at) rather than `id` alone — `id` remains the logical
    # per-row identity at the application level, `created_at` is what makes it a valid
    # hypertable key (see the `create_hypertable` call in this table's Alembic migration).
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, server_default=func.now()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    xp_type: Mapped[str] = mapped_column(String(20), nullable=False)
    xp_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason_code: Mapped[str] = mapped_column(String(80), nullable=False)
    multiplier_applied: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    entry_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    integrity_status: Mapped[str] = mapped_column(String(20), nullable=False, default="verified")
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class ProgressContextSnapshot(Base):
    """Append-only — old versions are never overwritten (gamification §5.4 step 7)."""

    __tablename__ = "progress_context_snapshot"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    context_version: Mapped[int] = mapped_column(Integer, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    rank: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    streak: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    league: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    guild: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    unresolved_flags: Mapped[list[str]] = mapped_column(
        ARRAY(String(60)), nullable=False, default=list
    )
    freeze_status: Mapped[str] = mapped_column(String(30), nullable=False, default="live")
