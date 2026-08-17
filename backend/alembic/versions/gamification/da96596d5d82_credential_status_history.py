"""credential status history (B3)

Revision ID: da96596d5d82
Revises: da96596d5d90
Create Date: 2026-08-17 15:00:00.000000

Adds the append-only `credential_status_history` table (B3 — gamification §7.4):
every credential status transition (flagged -> verified / flagged -> revoked /
verified -> revoked) records one immutable row, written atomically with the
status change. Reviewer decisions are never updated or deleted.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "da96596d5d82"
down_revision: str | None = "da96596d5d90"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "credential_status_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("credential_id", UUID(as_uuid=True), nullable=False),
        sa.Column("previous_status", sa.String(length=20), nullable=False),
        sa.Column("new_status", sa.String(length=20), nullable=False),
        sa.Column("reviewer_id", UUID(as_uuid=True), nullable=False),
        sa.Column("org_id", UUID(as_uuid=True), nullable=True),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(
        "ix_credential_status_history_credential_id",
        "credential_status_history",
        ["credential_id"],
    )
    op.create_index(
        "ix_credential_status_history_reviewer_id",
        "credential_status_history",
        ["reviewer_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_credential_status_history_reviewer_id", table_name="credential_status_history"
    )
    op.drop_index(
        "ix_credential_status_history_credential_id", table_name="credential_status_history"
    )
    op.drop_table("credential_status_history")
