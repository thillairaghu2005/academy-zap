"""Gamification tables: `xp_ledger` (append-only, hash-chained; converted to a TimescaleDB
hypertable partitioned by `created_at` in its Alembic migration — see
`alembic/versions/gamification/`) and `progress_context_snapshot` (append-only, one row per
`context_version`; see the assumption register in the backend README / plan for why this table
exists even though §5.3 doesn't name storage for it explicitly).

Slice 08 adds the badge/credential surface (gamification §7.3): `badge_definition` (the
versioned catalog — a definition is distinct from any user's award), `user_badge` (the
append-only, per-user award record with a database-level uniqueness invariant), and
`credential` (the signed W3C-Verifiable-Credential-shaped document backing each badge award,
with a non-guessable public id used at the verify URL).
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from platform_core.core.db.base import Base


class LedgerEntry(Base):
    __tablename__ = "xp_ledger"

    # TimescaleDB requires the partitioning column in every unique/primary-key constraint, so
    # the PK is composite (id, created_at) rather than `id` alone — `id` remains the logical
    # per-row identity at the application level, `created_at` is what makes it a valid
    # hypertable key (see the `create_hypertable` call in this table's Alembic migration).
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, server_default=func.now()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    xp_type: Mapped[str] = mapped_column(String(20), nullable=False)
    xp_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason_code: Mapped[str] = mapped_column(String(80), nullable=False)
    multiplier_applied: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    entry_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    integrity_status: Mapped[str] = mapped_column(String(20), nullable=False, default="verified")
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class ProgressContextSnapshot(Base):
    """Append-only — old versions are never overwritten (gamification §5.4 step 7)."""

    __tablename__ = "progress_context_snapshot"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    context_version: Mapped[int] = mapped_column(Integer, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    rank: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    streak: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    league: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    guild: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    unresolved_flags: Mapped[list[str]] = mapped_column(
        ARRAY(String(60)), nullable=False, default=list
    )
    freeze_status: Mapped[str] = mapped_column(String(30), nullable=False, default="live")


class BadgeDefinition(Base):
    """The badge catalog (slice 08). A definition is distinct from any user's award — the
    eligibility rules are evaluated by the backend against authoritative events/state, never
    by the frontend. The catalog is seeded deterministically (migration) and versioned here.

    `trigger` selects WHICH authoritative signal starts an evaluation:
      - course_completed       (CourseCompletedEvent)
      - assessment_submitted   (AssessmentSubmittedEvent)
      - streak_milestone       (ProgressContext.streak, re-evaluated after any event)
      - rank_milestone         (ProgressContext.rank, re-evaluated after any event)
    `threshold` carries the deterministic threshold params (e.g. {"min_score_pct": 100},
    {"min_streak_days": 7}, {"min_level": 3}). Both live in the seed data — this table is the
    smallest production model the architecture supports (gamification §7.3).
    """

    __tablename__ = "badge_definition"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Stable, human-readable code (e.g. "first_course_completed") — this is what user_badge
    # references and what the read API exposes as `badge_id` (the locked frontend contract).
    badge_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    trigger: Mapped[str] = mapped_column(String(40), nullable=False)
    threshold: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class UserBadge(Base):
    """Append-only per-user award (slice 08, Phase 5).

    Invariant: same user + same badge = one authoritative award, enforced at the database
    level by UNIQUE(user_id, badge_id). Replayed or concurrent events therefore can never
    create a duplicate award. A badge award is never mutated or deleted — the only lifecycle
    change happens on the linked credential's status (verified -> revoked via the B3 review
    queue once reversal exists).
    """

    __tablename__ = "user_badge"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    badge_id: Mapped[str] = mapped_column(
        String(80), nullable=False, index=True
    )
    # Auditability: the originating event (Phase 6) — a badge award always traces to the event
    # that made it eligible, and to the signed credential issued for it.
    source_event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    credential_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    awarded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    __table_args__ = (
        # The idempotency invariant: one authoritative award per (user, badge).
        UniqueConstraint("user_id", "badge_id", name="uq_user_badge_user_badge"),
    )


class LeagueSeason(Base):
    """A competitive season (slice 09 — gamification §5.3/§5.4 step 5).

    Season boundaries are hard cutoffs: league standing pulls from the current season's
    ledger slice only, and a completed season's result is frozen and archived (§5.4 step 5,
    §8 table "Seasonal leagues"). Status is explicit and one-way forward:
    scheduled -> active -> completed.
    """

    __tablename__ = "league_season"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled")
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Season config: promotion_slots / demotion_slots and any future knobs. Seeded defaults
    # live in the season service — the config column only overrides them.
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    __table_args__ = (
        # Season state is a closed set (scheduled -> active -> completed) and a season's
        # time box must be well-formed. The partial unique index is the DB-level
        # guarantee of at most one ACTIVE season (the service's activation guard is the
        # app-level fast path; the index makes the invariant hold under concurrency).
        CheckConstraint(
            "status IN ('scheduled', 'active', 'completed')",
            name="ck_league_season_status",
        ),
        CheckConstraint("end_at > start_at", name="ck_league_season_time_range"),
        Index(
            "uq_league_season_single_active",
            "status",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )


class LeagueTier(Base):
    """The league tier catalog (slice 09). The doc pins five tiers (bronze -> obsidian,
    gamification §5.3 `LeagueTier`); a definition is distinct from any user's membership.
    `display_order` is the promotion ladder (1 = bronze … 5 = obsidian)."""

    __tablename__ = "league_tier"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tier_id: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)


class SeasonMembership(Base):
    """One user's membership in one season (slice 09). `xp_this_season` is a derived,
    server-computed projection of the authoritative XP ledger (the ledger stays the only XP
    authority — this is a time-boxed slice over it, never a second XP system).

    Unique (user, season): a user has exactly one membership per season. The outcome
    (promoted / demoted / retained) is written once at season finalization and frozen.
    """

    __tablename__ = "season_membership"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    season_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    league_tier: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    # Derived season XP — recomputed server-side from ledger entries within [start_at, end_at).
    xp_this_season: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rank_in_league: Mapped[int | None] = mapped_column(Integer, nullable=True)
    promotion_zone: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    relegation_zone: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # active | promoted | demoted | retained — outcome set at finalization.
    outcome: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    __table_args__ = (
        # One authoritative membership per (user, season).
        UniqueConstraint("user_id", "season_id", name="uq_season_membership_user_season"),
        # Referential integrity: a membership always points at a real season and a real
        # tier, and the outcome (set once at finalization) is a closed set. The tier
        # catalog lives in `league_tier`; memberships reference it by its stable tier_id.
        ForeignKeyConstraint(
            ["season_id"], ["league_season.id"], name="fk_season_membership_season"
        ),
        ForeignKeyConstraint(
            ["league_tier"], ["league_tier.tier_id"], name="fk_season_membership_tier"
        ),
        CheckConstraint(
            "outcome IS NULL OR outcome IN ('active', 'promoted', 'demoted', 'retained')",
            name="ck_season_membership_outcome",
        ),
    )


class CredentialStatusHistory(Base):
    """Append-only review decision record (B3 — gamification §7.4).

    Every credential status transition (flagged -> verified / revoked) writes one row here,
    atomically with the status change itself. Rows are never updated or deleted — a reviewer's
    decision is immutable history, the same recursive "audited about auditing" rule the
    platform applies to `audit_log`.
    """

    __tablename__ = "credential_status_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    credential_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    previous_status: Mapped[str] = mapped_column(String(20), nullable=False)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    reviewer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Credential(Base):
    """One signed verifiable credential per badge award (slice 08, Phase 7-9).

    `public_id` is the externally exposed, non-guessable credential identity used in the
    public verify URL (/verify/{public_id}) — random, stable, and never the internal `id`.
    `claim` is the W3C-VC-shaped payload (category/level/rank at issuance, earned_at), and
    `signature` is the Ed25519 signature over it (gamification §7.3). `status` reflects
    current truth at the stable URL: verified / flagged (frozen pending review) / revoked
    (when the underlying ledger entries are reversed via the B3 review queue).
    """

    __tablename__ = "credential"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    public_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    badge_id: Mapped[str] = mapped_column(
        String(80), nullable=False, index=True
    )
    credential_type: Mapped[str] = mapped_column(String(30), nullable=False, default="badge")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="verified")
    issuer: Mapped[str] = mapped_column(String(80), nullable=False, default="Zapsters")
    claim: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    signature: Mapped[str] = mapped_column(Text, nullable=False)
    source_event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )