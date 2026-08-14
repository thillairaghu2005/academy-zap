"""merge the independent subsystem foundation migrations

Revision ID: c7d8e9f0a1b2
Revises: eight subsystem foundation heads
"""

from collections.abc import Sequence

revision: str = "c7d8e9f0a1b2"
down_revision: tuple[str, ...] = (
    "4fe2535975b6",
    "4d0e22351499",
    "6418234aec24",
    "228d7f0a6509",
    "0ec1461a7162",
    "ebe0369eca37",
    "da96596d5d79",
    "a006cabc5033",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
