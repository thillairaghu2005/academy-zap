"""add organization scope to audit logs

Revision ID: b1c2d3e4f5a6
Revises: a006cabc5033
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: str | None = "c7d8e9f0a1b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("audit_log", sa.Column("org_id", sa.UUID(), nullable=True))
    op.create_index("audit_log_org_id_idx", "audit_log", ["org_id"], unique=False)


def downgrade() -> None:
    op.drop_index("audit_log_org_id_idx", table_name="audit_log")
    op.drop_column("audit_log", "org_id")
