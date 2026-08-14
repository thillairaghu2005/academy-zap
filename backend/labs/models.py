"""Lab Engine tables (platform §4.2): `labs`, `lab_sessions`, `lab_objectives`.

A lab is a plug-in (platform §2.5): its objectives come from a declarative manifest, so
`LabObjective.id` is a manifest-authored string slug (e.g. "find-flag"), not a generated UUID —
matching `lib/contracts/lab.ts`'s `id: string`.
"""

import uuid
from datetime import datetime

from sqlalchemy import ARRAY, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from platform_core.core.db.base import Base


class Lab(Base):
    __tablename__ = "lab"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    requires_gui: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    hard_timeout_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    objectives: Mapped[list["LabObjective"]] = relationship(
        back_populates="lab", cascade="all, delete-orphan", order_by="LabObjective.position"
    )


class LabObjective(Base):
    __tablename__ = "lab_objective"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    lab_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab.id", ondelete="CASCADE"), primary_key=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    hints: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    requires_terminal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    lab: Mapped[Lab] = relationship(back_populates="objectives")


class LabSession(Base):
    __tablename__ = "lab_session"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    lab_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="provisioning")
    provisioned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    objectives_completed: Mapped[list[str]] = mapped_column(
        ARRAY(String(80)), nullable=False, default=list
    )
    checks: Mapped[list[dict[str, object]]] = mapped_column(JSONB, nullable=False, default=list)
    hints_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    terminal_url: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
