"""judge tenant + worker columns

Adds the F-6 tenant anchor (org_id) to problem and submission, the worker's `error` column,
and `updated_at` for the reconciliation window (F-10).

Revision ID: b7c3a1f2d4e5
Revises: 228d7f0a6509
Create Date: 2026-08-18 09:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7c3a1f2d4e5"
down_revision: str | None = "228d7f0a6509"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # F-6: tenant anchors — plain UUIDs, never FKs into core.org (platform §4.2).
    op.add_column("problem", sa.Column("org_id", sa.UUID(), nullable=True))
    op.create_index(op.f("ix_problem_org_id"), "problem", ["org_id"], unique=False)

    op.add_column("submission", sa.Column("org_id", sa.UUID(), nullable=True))
    op.create_index(op.f("ix_submission_org_id"), "submission", ["org_id"], unique=False)

    # Worker failure recording (F-10).
    op.add_column("submission", sa.Column("error", sa.Text(), nullable=True))

    # Reconciliation window (F-10) + claim timestamp.
    op.add_column(
        "submission",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("submission", "updated_at")
    op.drop_column("submission", "error")
    op.drop_index(op.f("ix_submission_org_id"), table_name="submission")
    op.drop_column("submission", "org_id")
    op.drop_index(op.f("ix_problem_org_id"), table_name="problem")
    op.drop_column("problem", "org_id")
