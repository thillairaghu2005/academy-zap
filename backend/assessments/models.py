"""Assessment Engine tables (platform §4.2): `assessments`, `questions`,
`assessment_submissions`. Difficulty is a static, versioned field — never model-inferred at
score time (platform §2.6).
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from platform_core.core.db.base import Base


class Assessment(Base):
    __tablename__ = "assessment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    attempts_allowed: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    passing_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=70)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    questions: Mapped[list["Question"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan", order_by="Question.position"
    )


class Question(Base):
    __tablename__ = "question"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessment.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(10), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    accepted_answers: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    starter_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    assessment: Mapped[Assessment] = relationship(back_populates="questions")


class AssessmentSubmission(Base):
    """One attempt record — `question_level_answers` stored raw before any scoring, per the
    "never discard raw" law (gamification §4).
    """

    __tablename__ = "assessment_submission"
    __table_args__ = (
        UniqueConstraint(
            "assessment_id", "user_id", "attempt_number", name="assessment_user_attempt_key"
        ),
    )

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessment.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="in_progress")
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    question_level_answers: Mapped[list[dict[str, object]]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    score: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0)
    integrity_flags: Mapped[list[str]] = mapped_column(
        ARRAY(String(60)), nullable=False, default=list
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
