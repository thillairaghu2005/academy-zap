"""add org_id and append_only to ledger

Revision ID: da96596d5d80
Revises: da96596d5d79
Create Date: 2026-08-17 10:28:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "da96596d5d80"
down_revision: str | None = "da96596d5d79"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add columns for Fix 1
    op.add_column("xp_ledger", sa.Column("org_id", sa.UUID(), nullable=True))
    op.add_column("xp_ledger", sa.Column("source_type", sa.String(length=40), nullable=True))
    op.add_column("xp_ledger", sa.Column("source_id", sa.UUID(), nullable=True))

    # Fix 3: Enforce append-only
    # Note: Timescale requires partitioning column (created_at) in unique constraints
    op.create_index(
        "xp_ledger_user_event_created_idx",
        "xp_ledger",
        ["user_id", "event_id", "created_at"],
        unique=True,
    )

    # Add append-only trigger
    op.execute(
        """
        CREATE OR REPLACE FUNCTION enforce_xp_ledger_append_only()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'xp_ledger is an append-only table. Updates and deletes are forbidden.';
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_xp_ledger_append_only
        BEFORE UPDATE OR DELETE ON xp_ledger
        FOR EACH ROW EXECUTE FUNCTION enforce_xp_ledger_append_only();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_xp_ledger_append_only ON xp_ledger")
    op.execute("DROP FUNCTION IF EXISTS enforce_xp_ledger_append_only()")
    
    op.drop_index("xp_ledger_user_event_created_idx", table_name="xp_ledger")
    
    op.drop_column("xp_ledger", "source_id")
    op.drop_column("xp_ledger", "source_type")
    op.drop_column("xp_ledger", "org_id")
