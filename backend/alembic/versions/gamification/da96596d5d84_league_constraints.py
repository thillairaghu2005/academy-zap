"""league/season constraints (slice 09 hardening)

Revision ID: da96596d5d84
Revises: da96596d5d83
Create Date: 2026-08-17 17:00:00.000000

Adds the DB-level invariants Phase 17 requires, on top of the slice-09 tables from
`da96596d5d83`:

- `league_season.status` is a closed set (scheduled -> active -> completed) and a season's
  time box must be well-formed (`end_at > start_at`).
- At most one ACTIVE season, enforced by a partial unique index (the service's activation
  guard is the app-level fast path; the index is the guarantee under concurrency).
- `season_membership.season_id` -> `league_season.id` and
  `season_membership.league_tier` -> `league_tier.tier_id` foreign keys (referential
  integrity — a membership always points at a real season and a real tier).
- `season_membership.outcome` is a closed set (set once at finalization).

TimescaleDB note: these tables are ordinary (non-hypertable) tables — `xp_ledger` is the
only hypertable and is untouched here, so no hypertable/unique-constraint conflict is
introduced.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "da96596d5d84"
down_revision: str | None = "da96596d5d83"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Constraint names must match the model's `create_all` output byte-for-byte so the
    # migrated schema and the test schema are identical. The shared MetaData naming
    # convention (fastapi-backend-sop.md §6.2) wraps CheckConstraint names as
    # `{table}_{constraint_name}_check`, while FK/index names are used verbatim — so the
    # unwrapped base names below produce exactly the same DDL as `create_all`.
    op.create_check_constraint(
        "ck_league_season_status",
        "league_season",
        "status IN ('scheduled', 'active', 'completed')",
    )
    op.create_check_constraint(
        "ck_league_season_time_range",
        "league_season",
        "end_at > start_at",
    )
    op.create_index(
        "uq_league_season_single_active",
        "league_season",
        ["status"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )
    op.create_foreign_key(
        "fk_season_membership_season",
        "season_membership",
        "league_season",
        ["season_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_season_membership_tier",
        "season_membership",
        "league_tier",
        ["league_tier"],
        ["tier_id"],
    )
    op.create_check_constraint(
        "ck_season_membership_outcome",
        "season_membership",
        "outcome IS NULL OR outcome IN ('active', 'promoted', 'demoted', 'retained')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_season_membership_outcome", "season_membership", type_="check"
    )
    op.drop_constraint("fk_season_membership_tier", "season_membership", type_="foreignkey")
    op.drop_constraint("fk_season_membership_season", "season_membership", type_="foreignkey")
    op.drop_index("uq_league_season_single_active", table_name="league_season")
    op.drop_constraint(
        "ck_league_season_time_range", "league_season", type_="check"
    )
    op.drop_constraint(
        "ck_league_season_status", "league_season", type_="check"
    )
