"""prevent duplicate assessment attempt numbers

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
"""

from collections.abc import Sequence

from alembic import op

revision: str = "f7a8b9c0d1e2"
down_revision: str | None = "e6f7a8b9c0d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "assessment_user_attempt_key",
        "assessment_submission",
        ["assessment_id", "user_id", "attempt_number"],
    )


def downgrade() -> None:
    op.drop_constraint("assessment_user_attempt_key", "assessment_submission", type_="unique")
