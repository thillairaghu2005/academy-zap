"""add assessment access scope (course, tenant, publication)

Revision ID: a1b2c3d4e5f6
Revises: f7a8b9c0d1e2
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "f7a8b9c0d1e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("assessment", sa.Column("course_id", sa.UUID(), nullable=True))
    op.add_column("assessment", sa.Column("org_id", sa.UUID(), nullable=True))
    op.add_column(
        "assessment",
        sa.Column(
            "status", sa.String(length=20), nullable=False, server_default="published"
        ),
    )
    op.create_index("assessment_course_id_idx", "assessment", ["course_id"], unique=False)
    op.create_index("assessment_org_id_idx", "assessment", ["org_id"], unique=False)


def downgrade() -> None:
    op.drop_index("assessment_org_id_idx", table_name="assessment")
    op.drop_index("assessment_course_id_idx", table_name="assessment")
    op.drop_column("assessment", "status")
    op.drop_column("assessment", "org_id")
    op.drop_column("assessment", "course_id")
