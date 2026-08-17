"""badges and credentials (slice 08)

Revision ID: da96596d5d81
Revises: da96596d5d80
Create Date: 2026-08-17 12:00:00.000000

Adds the gamification §7.3 badge/credential surface:
  - badge_definition  — the deterministic, versioned badge catalog (a definition is distinct
                        from any user's award; the backend evaluates eligibility).
  - user_badge        — append-only per-user award; UNIQUE(user_id, badge_id) is the
                        database-level idempotency invariant (Phase 5).
  - credential        — the signed W3C-VC-shaped document per award; `public_id` is the
                        non-guessable identity used in the public verify URL (Phase 7-10).

The catalog seed is the smallest deterministic set this slice implements. The source docs
(gamification §6/§7.3, platform §1) define the badge *mechanism* but do not enumerate a
catalog, so the four definitions below map to the authoritative signals that already exist
(course.completed, assessment.submitted, ProgressContext streak, ProgressContext rank) and
are documented in the slice-08 report as an explicit small-set decision.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "da96596d5d81"
down_revision: str | None = "da96596d5d80"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _seed_badge_definitions() -> None:
    """Deterministic seed: stable UUIDs + stable badge_ids so the catalog never duplicates on
    re-upgrade and the migration is byte-for-byte reproducible."""
    definitions = [
        {
            "id": "11111111-1111-4111-8111-000000000001",
            "badge_id": "first_course_completed",
            "name": "First Course Completed",
            "description": "Completed your first course on Zapsters.",
            "category": "learning",
            "trigger": "course_completed",
            "threshold": {},
        },
        {
            "id": "11111111-1111-4111-8111-000000000002",
            "badge_id": "perfect_assessment",
            "name": "Perfect Score",
            "description": "Scored 100% on an assessment.",
            "category": "mastery",
            "trigger": "assessment_submitted",
            "threshold": {"min_score_pct": 100},
        },
        {
            "id": "11111111-1111-4111-8111-000000000003",
            "badge_id": "streak_seven",
            "name": "7-Day Streak",
            "description": "Maintained a 7-day learning streak.",
            "category": "streak",
            "trigger": "streak_milestone",
            "threshold": {"min_streak_days": 7},
        },
        {
            "id": "11111111-1111-4111-8111-000000000004",
            "badge_id": "rank_spartan",
            "name": "Spartan",
            "description": "Reached the Spartan rank (level 3).",
            "category": "progression",
            "trigger": "rank_milestone",
            "threshold": {"min_level": 3},
        },
    ]
    # Fixed seed timestamp (not now()) so the catalog is byte-for-byte reproducible.
    from datetime import UTC
    from datetime import datetime as _datetime

    seed_created_at = _datetime(2026, 8, 17, 12, 0, 0, tzinfo=UTC)
    op.bulk_insert(
        sa.table(
            "badge_definition",
            sa.column("id", UUID(as_uuid=True)),
            sa.column("badge_id", sa.String()),
            sa.column("name", sa.String()),
            sa.column("description", sa.String()),
            sa.column("category", sa.String()),
            sa.column("trigger", sa.String()),
            sa.column("threshold", postgresql.JSONB()),
            sa.column("enabled", sa.Boolean()),
            sa.column("created_at", sa.DateTime(timezone=True)),
        ),
        [{"enabled": True, "created_at": seed_created_at, **d} for d in definitions],
    )


def upgrade() -> None:
    op.create_table(
        "badge_definition",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("badge_id", sa.String(length=80), nullable=False, unique=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("trigger", sa.String(length=40), nullable=False),
        sa.Column("threshold", postgresql.JSONB(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_badge_definition_trigger", "badge_definition", ["trigger"])

    op.create_table(
        "user_badge",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("badge_id", sa.String(length=80), nullable=False),
        sa.Column("source_event_id", UUID(as_uuid=True), nullable=False),
        sa.Column("credential_id", UUID(as_uuid=True), nullable=True),
        sa.Column("org_id", UUID(as_uuid=True), nullable=True),
        sa.Column("awarded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "badge_id", name="uq_user_badge_user_badge"),
    )
    op.create_index("ix_user_badge_user_id", "user_badge", ["user_id"])
    op.create_index("ix_user_badge_badge_id", "user_badge", ["badge_id"])
    op.create_index("ix_user_badge_credential_id", "user_badge", ["credential_id"])

    op.create_table(
        "credential",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("public_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("badge_id", sa.String(length=80), nullable=False),
        sa.Column("credential_type", sa.String(length=30), nullable=False, server_default="badge"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="verified"),
        sa.Column("issuer", sa.String(length=80), nullable=False, server_default="Zapsters"),
        sa.Column("claim", postgresql.JSONB(), nullable=False),
        sa.Column("signature", sa.Text(), nullable=False),
        sa.Column("source_event_id", UUID(as_uuid=True), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_credential_user_id", "credential", ["user_id"])
    op.create_index("ix_credential_badge_id", "credential", ["badge_id"])

    _seed_badge_definitions()


def downgrade() -> None:
    op.drop_table("credential")
    op.drop_table("user_badge")
    op.drop_table("badge_definition")
