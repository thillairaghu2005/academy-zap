"""Core subsystem: `org` — B2B/org-scoped multi-tenancy anchor.

Every other subsystem's `org_id` column is a plain UUID, never a foreign key into this table
(platform §4.2, §8.1: no subsystem may FK/join into another subsystem's tables) — org-scoping is
enforced at the repository layer per query, not by a cross-subsystem constraint.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from platform_core.core.db.base import Base


class Org(Base):
    __tablename__ = "org"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
