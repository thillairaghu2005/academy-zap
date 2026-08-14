"""retain raw event payloads for replay and integrity review

Revision ID: d4e5f6a7b8c9
Revises: b1c2d3e4f5a6
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: str | None = "b1c2d3e4f5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "processed_event",
        sa.Column(
            "raw_event",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.alter_column("processed_event", "raw_event", server_default=None)


def downgrade() -> None:
    op.drop_column("processed_event", "raw_event")
