"""Lab Engine tables (platform §4.2): `lab`, `lab_session`, `lab_objective`, plus the
notebook engine (B6) tables: `lab_version`, `lab_section`, `lab_cell`, `user_lab_progress`,
`user_checkpoint`, `lab_cell_execution`.

A lab is a plug-in (platform §2.5): its objectives come from a declarative manifest, so
`LabObjective.id` is a manifest-authored string slug (e.g. "find-flag"), not a generated UUID —
matching `lib/contracts/lab.ts`'s `id: string`.

Notebook content (B6) is versioned exactly like course content: a `Lab` owns zero or more
`LabVersion` snapshots; published versions are IMMUTABLE — content changes land in a NEW
version, never in-place on a published one (platform §4.2 "versioned"). Learners work against
one pinned version via `UserLabProgress`, and each code-cell run is a `LabCellExecution` row
(one queued/processing/terminal state machine) so the labs worker can claim work atomically —
mirroring Judge's `Submission`, never executed inline on the request path.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
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
    # Tenant anchor (platform §4.2): a plain UUID, never a FK into core.org (cross-subsystem
    # rule). NULL = public lab usable by any org; a set org_id scopes it to that tenant.
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    objectives: Mapped[list["LabObjective"]] = relationship(
        back_populates="lab", cascade="all, delete-orphan", order_by="LabObjective.position"
    )

    versions: Mapped[list["LabVersion"]] = relationship(
        back_populates="lab", cascade="all, delete-orphan", order_by="LabVersion.version"
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


class LabVersion(Base):
    """An immutable snapshot of a lab's notebook content.

    Only a `published` version is served to learners. Content is never mutated on a published
    version — a content change is a NEW row (platform §4.2 "versioned"). The `(lab_id, version)`
    unique pair guarantees a monotonically increasing, collision-free version sequence per lab.
    """

    __tablename__ = "lab_version"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lab_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    lab: Mapped[Lab] = relationship(back_populates="versions")
    sections: Mapped[list["LabSection"]] = relationship(
        back_populates="version", cascade="all, delete-orphan", order_by="LabSection.position"
    )

    __table_args__ = (UniqueConstraint("lab_id", "version", name="uq_lab_version_lab_version"),)


class LabSection(Base):
    """One titled block of a notebook version, holding an ordered run of cells."""

    __tablename__ = "lab_section"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab_version.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    version: Mapped[LabVersion] = relationship(back_populates="sections")
    cells: Mapped[list["LabCell"]] = relationship(
        back_populates="section", cascade="all, delete-orphan", order_by="LabCell.position"
    )


class LabCell(Base):
    """One notebook cell. `markdown` = prose the learner reads; `code` = a Python cell the
    learner runs (a cell id is the session's objective id for the completion gate)."""

    __tablename__ = "lab_cell"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab_section.id", ondelete="CASCADE"), nullable=False
    )
    cell_type: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    section: Mapped[LabSection] = relationship(back_populates="cells")


class UserLabProgress(Base):
    """One learner's live session against ONE pinned published lab version.

    Stores the autosaved code (cell_id -> source) plus session bookkeeping; per-cell execution
    output lives in `LabCellExecution`, keyed to this progress row.
    """

    __tablename__ = "user_lab_progress"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lab_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab.id", ondelete="CASCADE"), nullable=False
    )
    # The immutable version snapshot this session works against; never swapped mid-session.
    version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab_version.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="in_progress")
    # Autosaved source per cell: cell_id (str) -> latest code the learner typed.
    code: Mapped[dict[str, str]] = mapped_column(JSONB, nullable=False, default=dict)
    hints_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    lab: Mapped[Lab] = relationship()
    checkpoints: Mapped[list["UserCheckpoint"]] = relationship(
        back_populates="progress",
        cascade="all, delete-orphan",
        order_by="UserCheckpoint.created_at",
    )

    __table_args__ = (UniqueConstraint("lab_id", "user_id", name="uq_user_lab_progress_lab_user"),)


class UserCheckpoint(Base):
    """A learner's explicit snapshot of the session, for undo/replay within the notebook."""

    __tablename__ = "user_checkpoint"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progress_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_lab_progress.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    # Immutable copy of {code, per-cell output state} at save time.
    snapshot: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    progress: Mapped[UserLabProgress] = relationship(back_populates="checkpoints")


class LabCellExecution(Base):
    """One queued/ran execution of a single code cell — the worker's atomic claim target.

    Mirrors Judge's `Submission` (B6 "never execute Python inline"): the API enqueues a row in
    `queued` and writes one stream message; the labs worker claims it with
    `UPDATE ... WHERE status='queued' RETURNING`, runs it in the shared sandbox, and persists
    the bounded output here. `succeeded`/`failed` are terminal; `error` marks an infrastructure
    failure that exhausted retries.
    """

    __tablename__ = "lab_cell_execution"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progress_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_lab_progress.id", ondelete="CASCADE"), nullable=False
    )
    cell_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    stdout: Mapped[str | None] = mapped_column(Text, nullable=True)
    stderr: Mapped[str | None] = mapped_column(Text, nullable=True)
    exit_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    runtime_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memory_kb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    progress: Mapped[UserLabProgress] = relationship()
