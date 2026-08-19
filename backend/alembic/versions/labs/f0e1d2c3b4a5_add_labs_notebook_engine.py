"""add labs notebook engine (B6)

Revision ID: f0e1d2c3b4a5
Revises: e1f2a3b4c5d6
Create Date: 2026-08-18 11:00:00.000000

The labs base (0ec1461a7162) was folded into the release line by the foundation mergepoint
(c7d8e9f0a1b2), so this revision chains linearly from the current single release head
(e1f2a3b4c5d6) — no separate labs branch head and no merge revision are needed.

Adds the versioned notebook content model (B6): lab_version / lab_section / lab_cell as the
immutable manifest snapshots, user_lab_progress as one learner's live session against one
pinned version, user_checkpoint as explicit snapshots, and lab_cell_execution as the worker's
atomic claim target (mirrors Judge's submission row). Also adds the tenant anchor org_id to
the existing lab table.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f0e1d2c3b4a5"
down_revision: str | Sequence[str] | None = "e1f2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Tenant anchor on the catalog row (mirrors judge/problem.org_id).
    op.add_column(
        "lab",
        sa.Column("org_id", sa.UUID(), nullable=True),
    )
    op.create_index(op.f("ix_lab_org_id"), "lab", ["org_id"], unique=False)

    op.create_table(
        "lab_version",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("lab_id", sa.UUID(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["lab_id"], ["lab.id"], name=op.f("lab_version_lab_id_fkey"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("lab_version_pkey")),
        sa.UniqueConstraint("lab_id", "version", name=op.f("uq_lab_version_lab_version")),
    )
    op.create_table(
        "lab_section",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("version_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["version_id"],
            ["lab_version.id"],
            name=op.f("lab_section_version_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("lab_section_pkey")),
    )
    op.create_table(
        "lab_cell",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("section_id", sa.UUID(), nullable=False),
        sa.Column("cell_type", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["section_id"], ["lab_section.id"], name=op.f("lab_cell_section_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("lab_cell_pkey")),
    )
    op.create_table(
        "user_lab_progress",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("lab_id", sa.UUID(), nullable=False),
        sa.Column("version_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("code", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("hints_used", sa.Integer(), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["lab_id"], ["lab.id"], name=op.f("user_lab_progress_lab_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["version_id"], ["lab_version.id"], name=op.f("user_lab_progress_version_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("user_lab_progress_pkey")),
        sa.UniqueConstraint("lab_id", "user_id", name=op.f("uq_user_lab_progress_lab_user")),
    )
    op.create_index(
        op.f("ix_user_lab_progress_org_id"), "user_lab_progress", ["org_id"], unique=False
    )
    op.create_index(
        op.f("ix_user_lab_progress_user_id"), "user_lab_progress", ["user_id"], unique=False
    )
    op.create_table(
        "user_checkpoint",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("progress_id", sa.UUID(), nullable=False),
        sa.Column("label", sa.String(length=200), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["progress_id"],
            ["user_lab_progress.id"],
            name=op.f("user_checkpoint_progress_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("user_checkpoint_pkey")),
    )
    op.create_table(
        "lab_cell_execution",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("progress_id", sa.UUID(), nullable=False),
        sa.Column("cell_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=True),
        sa.Column("source_code", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("stdout", sa.Text(), nullable=True),
        sa.Column("stderr", sa.Text(), nullable=True),
        sa.Column("exit_code", sa.Integer(), nullable=True),
        sa.Column("runtime_ms", sa.Integer(), nullable=True),
        sa.Column("memory_kb", sa.Integer(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["progress_id"],
            ["user_lab_progress.id"],
            name=op.f("lab_cell_execution_progress_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("lab_cell_execution_pkey")),
    )
    op.create_index(
        op.f("ix_lab_cell_execution_cell_id"), "lab_cell_execution", ["cell_id"], unique=False
    )
    op.create_index(
        op.f("ix_lab_cell_execution_org_id"), "lab_cell_execution", ["org_id"], unique=False
    )
    op.create_index(
        op.f("ix_lab_cell_execution_user_id"), "lab_cell_execution", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_lab_cell_execution_user_id"), table_name="lab_cell_execution")
    op.drop_index(op.f("ix_lab_cell_execution_org_id"), table_name="lab_cell_execution")
    op.drop_index(op.f("ix_lab_cell_execution_cell_id"), table_name="lab_cell_execution")
    op.drop_table("lab_cell_execution")
    op.drop_table("user_checkpoint")
    op.drop_index(op.f("ix_user_lab_progress_user_id"), table_name="user_lab_progress")
    op.drop_index(op.f("ix_user_lab_progress_org_id"), table_name="user_lab_progress")
    op.drop_table("user_lab_progress")
    op.drop_table("lab_cell")
    op.drop_table("lab_section")
    op.drop_table("lab_version")
    op.drop_index(op.f("ix_lab_org_id"), table_name="lab")
    op.drop_column("lab", "org_id")