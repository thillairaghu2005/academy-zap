"""Judge Engine tables (platform §4.2): `problems`, `submissions`, `test_cases` (hidden).
Ephemeral pod state stays in Kubernetes, never in Postgres (platform §4.2).
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from platform_core.core.db.base import Base


class Problem(Base):
    __tablename__ = "problem"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(10), nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    topics: Mapped[list[str]] = mapped_column(ARRAY(String(60)), nullable=False, default=list)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    constraints: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    starter_code: Mapped[str] = mapped_column(Text, nullable=False, default="")
    time_limit_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=2000)
    memory_limit_kb: Mapped[int] = mapped_column(Integer, nullable=False, default=262144)
    expected_solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Tenant anchor (platform §4.2): a plain UUID, never a FK into core.org (cross-subsystem
    # rule). NULL = public problem usable by any org; a set org_id scopes it to that tenant.
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sample_cases: Mapped[list["SampleCase"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan", order_by="SampleCase.position"
    )


class SampleCase(Base):
    """Visible example case, shown on the problem statement (never the hidden grading set)."""

    __tablename__ = "sample_case"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("problem.id", ondelete="CASCADE"), nullable=False
    )
    input: Mapped[str] = mapped_column(Text, nullable=False)
    output: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    problem: Mapped["Problem"] = relationship(back_populates="sample_cases")


class TestCase(Base):
    """Hidden grading case — never served over any API (platform §2.4)."""

    __tablename__ = "test_case"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("problem.id", ondelete="CASCADE"), nullable=False
    )
    input: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Submission(Base):
    __tablename__ = "submission"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("problem.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    language: Mapped[str] = mapped_column(String(20), nullable=False)
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="queued")
    verdict: Mapped[str | None] = mapped_column(String(30), nullable=True)
    runtime_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memory_kb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    test_cases_passed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    test_cases_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stdout: Mapped[str | None] = mapped_column(Text, nullable=True)
    stderr: Mapped[str | None] = mapped_column(Text, nullable=True)
    compile_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    cases: Mapped[list[dict[str, object]] | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
