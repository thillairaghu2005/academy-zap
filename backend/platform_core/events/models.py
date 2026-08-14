"""Idempotency table — makes event redelivery a no-op (build.md B1).

Scoped per `(idempotency_key, consumer_group)`: two different subsystems may each need to
process the same event exactly once, so a single global `idempotency_key -> processed` mapping
would make the second subsystem incorrectly skip its own first delivery.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from platform_core.core.db.base import Base


class ProcessedEvent(Base):
    __tablename__ = "processed_event"

    idempotency_key: Mapped[str] = mapped_column(String(200), primary_key=True)
    consumer_group: Mapped[str] = mapped_column(String(80), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    # Raw, verbatim event storage supports replay and integrity review before scoring.
    raw_event: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
