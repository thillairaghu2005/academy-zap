"""merge release heads into one

Revision ID: da96596d5d90
Revises: a1b2c3d4e5f6, d4e5f6a7b8c0, da96596d5d81
Create Date: 2026-08-17 12:30:00.000000

The subsystem migrations branch at the foundation mergepoint (c7d8e9f0a1b2), then diverge
again: the "add outbox" line (d4e5f6a7b8c0) and the "assessment access scope" line
(a1b2c3d4e5f6) are siblings, and the gamification "add org_id and append_only to ledger"
migration (da96596d5d80) plus the slice-08 badges/credentials migration (da96596d5d81)
hang off the gamification branch. This revision merges the three current heads into one
release head so `alembic upgrade head` resolves deterministically.
"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "da96596d5d90"
down_revision: str | Sequence[str] | None = (
    "a1b2c3d4e5f6",
    "d4e5f6a7b8c0",
    "da96596d5d81",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Merge-only revision — no schema changes (all three branches already applied)."""
    pass


def downgrade() -> None:
    pass
