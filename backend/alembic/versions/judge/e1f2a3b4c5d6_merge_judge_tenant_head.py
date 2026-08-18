"""merge judge tenant head into release line

Revision ID: e1f2a3b4c5d6
Revises: b7c3a1f2d4e5, da96596d5d84
Create Date: 2026-08-18 09:30:00.000000

The judge tenant/worker columns migration (b7c3a1f2d4e5) hangs off the judge branch init
(228d7f0a6509), which the foundation mergepoint (c7d8e9f0a1b2) already folded into the release
line. This revision merges the new judge head back into the current release head so
`alembic upgrade head` resolves deterministically.
"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "e1f2a3b4c5d6"
down_revision: str | Sequence[str] | None = (
    "b7c3a1f2d4e5",
    "da96596d5d84",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Merge-only revision — no schema changes (both branches already applied)."""
    pass


def downgrade() -> None:
    pass
