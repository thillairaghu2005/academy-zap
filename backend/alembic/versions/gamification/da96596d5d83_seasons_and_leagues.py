"""seasons and leagues (slice 09)

Revision ID: da96596d5d83
Revises: da96596d5d82
Create Date: 2026-08-17 16:00:00.000000

Adds the competitive season surface (gamification §5.3/§5.4 step 5, §8 "Seasonal
leagues"): `league_season` (time-boxed, hard-cutoff seasons), `league_tier` (the five
pinned tiers bronze -> obsidian as a seeded catalog), and `season_membership` (one
derived membership per user+season; `xp_this_season` is a server-computed slice of the
authoritative XP ledger, never a second XP system). UNIQUE(user_id, season_id) is the
one-membership-per-season invariant.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "da96596d5d83"
down_revision: str | None = "da96596d5d82"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TIERS = [
    ("bronze", 1, "Bronze"),
    ("silver", 2, "Silver"),
    ("gold", 3, "Gold"),
    ("platinum", 4, "Platinum"),
    ("obsidian", 5, "Obsidian"),
]


def _seed_league_tiers() -> None:
    """Deterministic seed: stable UUIDs + stable tier_ids so the catalog never duplicates on
    re-upgrade and the migration is byte-for-byte reproducible."""
    op.bulk_insert(
        sa.table(
            "league_tier",
            sa.column("id", UUID(as_uuid=True)),
            sa.column("tier_id", sa.String()),
            sa.column("display_order", sa.Integer()),
            sa.column("name", sa.String()),
        ),
        [
            {
                "id": f"22222222-2222-4222-8222-00000000000{index}",
                "tier_id": tier_id,
                "display_order": display_order,
                "name": name,
            }
            for index, (tier_id, display_order, name) in enumerate(_TIERS, start=1)
        ],
    )


def upgrade() -> None:
    op.create_table(
        "league_season",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="scheduled"),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "league_tier",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tier_id", sa.String(length=30), nullable=False, unique=True),
        sa.Column("display_order", sa.Integer(), nullable=False, unique=True),
        sa.Column("name", sa.String(length=80), nullable=False),
    )

    op.create_table(
        "season_membership",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("season_id", UUID(as_uuid=True), nullable=False),
        sa.Column("league_tier", sa.String(length=30), nullable=False),
        sa.Column("xp_this_season", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("rank_in_league", sa.Integer(), nullable=True),
        sa.Column("promotion_zone", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("relegation_zone", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("outcome", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "season_id", name="uq_season_membership_user_season"),
    )
    op.create_index("ix_season_membership_user_id", "season_membership", ["user_id"])
    op.create_index("ix_season_membership_season_id", "season_membership", ["season_id"])
    op.create_index("ix_season_membership_league_tier", "season_membership", ["league_tier"])

    _seed_league_tiers()


def downgrade() -> None:
    op.drop_table("season_membership")
    op.drop_table("league_tier")
    op.drop_table("league_season")
