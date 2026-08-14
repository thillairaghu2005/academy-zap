"""add organization scope to courses

Revision ID: e6f7a8b9c0d1
Revises: d4e5f6a7b8c9
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e6f7a8b9c0d1"
down_revision: str | None = "d4e5f6a7b8c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("course", sa.Column("org_id", sa.UUID(), nullable=True))
    op.create_index("course_org_id_idx", "course", ["org_id"], unique=False)


def downgrade() -> None:
    op.drop_index("course_org_id_idx", table_name="course")
    op.drop_column("course", "org_id")
