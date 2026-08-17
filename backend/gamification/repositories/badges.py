"""Database queries for the badge/credential surface (slice 08) — no business logic
(fastapi-backend-sop.md §1.1, §13).

Awards and credentials are written with PostgreSQL `ON CONFLICT DO NOTHING` so the
database-level invariants (UNIQUE(user_id, badge_id); UNIQUE(public_id)) are the hard
guarantee against duplicate awards/identities — never just a check-then-insert race.
"""

import secrets
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.models import BadgeDefinition, Credential, CredentialStatusHistory, UserBadge


class BadgeDefinitionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_enabled(self) -> list[BadgeDefinition]:
        result = await self._session.execute(
            select(BadgeDefinition)
            .where(BadgeDefinition.enabled.is_(True))
            .order_by(BadgeDefinition.badge_id)
        )
        return list(result.scalars().all())

    async def list_all(self) -> list[BadgeDefinition]:
        """Every definition, including disabled ones — the read model needs an award's
        definition even if the catalog entry was later disabled."""
        result = await self._session.execute(
            select(BadgeDefinition).order_by(BadgeDefinition.badge_id)
        )
        return list(result.scalars().all())

    async def get_by_id(self, badge_id: str) -> BadgeDefinition | None:
        result = await self._session.execute(
            select(BadgeDefinition).where(BadgeDefinition.badge_id == badge_id)
        )
        return result.scalar_one_or_none()


class UserBadgeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def has_award(self, user_id: uuid.UUID, badge_id: str) -> bool:
        result = await self._session.execute(
            select(UserBadge.id).where(
                UserBadge.user_id == user_id,
                UserBadge.badge_id == badge_id,
            )
        )
        return result.first() is not None

    async def list_for_user(self, user_id: uuid.UUID) -> list[UserBadge]:
        result = await self._session.execute(
            select(UserBadge)
            .where(UserBadge.user_id == user_id)
            .order_by(UserBadge.awarded_at, UserBadge.id)
        )
        return list(result.scalars().all())

    async def award(
        self,
        *,
        user_id: uuid.UUID,
        badge_id: str,
        source_event_id: uuid.UUID,
        credential_id: uuid.UUID,
        org_id: uuid.UUID | None,
    ) -> UserBadge | None:
        """Insert one award. Returns None when the (user_id, badge_id) pair already exists
        (replayed/concurrent evaluation) — the ON CONFLICT clause makes that atomic."""
        awarded_at = datetime.now(UTC)
        stmt = (
            pg_insert(UserBadge)
            .values(
                id=uuid.uuid4(),
                user_id=user_id,
                badge_id=badge_id,
                source_event_id=source_event_id,
                credential_id=credential_id,
                org_id=org_id,
                awarded_at=awarded_at,
            )
            .on_conflict_do_nothing(index_elements=["user_id", "badge_id"])
            .returning(UserBadge.id)
        )
        result = await self._session.execute(stmt)
        row = result.first()
        if row is None:
            return None
        return UserBadge(
            id=row[0],
            user_id=user_id,
            badge_id=badge_id,
            source_event_id=source_event_id,
            credential_id=credential_id,
            org_id=org_id,
            awarded_at=awarded_at,
        )


def generate_public_id() -> str:
    """A fresh non-guessable public credential identity (Phase 9): random, stable, never a
    sequential internal id, and never derived from tokens or private data."""
    return secrets.token_urlsafe(24)


class CredentialRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_public_id(self, public_id: str) -> Credential | None:
        result = await self._session.execute(
            select(Credential).where(Credential.public_id == public_id)
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: uuid.UUID) -> list[Credential]:
        result = await self._session.execute(
            select(Credential)
            .where(Credential.user_id == user_id)
            .order_by(Credential.issued_at, Credential.id)
        )
        return list(result.scalars().all())

    async def get_by_ids(self, ids: list[uuid.UUID]) -> list[Credential]:
        if not ids:
            return []
        result = await self._session.execute(select(Credential).where(Credential.id.in_(ids)))
        return list(result.scalars().all())

    async def issue(
        self,
        *,
        public_id: str,
        user_id: uuid.UUID,
        badge_id: str,
        claim: dict[str, Any],
        signature: str,
        source_event_id: uuid.UUID,
    ) -> Credential:
        """Insert one signed credential with a caller-supplied non-guessable public id. The
        UNIQUE constraint on public_id is the identity invariant — a collision
        (astronomically unlikely for token_urlsafe) surfaces as a constraint violation
        rather than a duplicated public identity."""
        credential = Credential(
            id=uuid.uuid4(),
            public_id=public_id,
            user_id=user_id,
            badge_id=badge_id,
            credential_type="badge",
            status="verified",
            issuer="Zapsters",
            claim=claim,
            signature=signature,
            source_event_id=source_event_id,
        )
        self._session.add(credential)
        await self._session.flush()
        return credential

    async def list_for_review(
        self,
        *,
        status: str,
        org_id: uuid.UUID | None,
        badge_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Credential]:
        """The B3 admin review queue — flagged (and optionally badge/org-filtered)
        credentials, oldest first so reviewers work through the backlog. Org scope comes from
        the award's `user_badge.org_id` (the credential table itself has no org column);
        `org_id=None` means platform-ops (all orgs)."""
        statement = (
            select(Credential)
            .join(UserBadge, UserBadge.credential_id == Credential.id)
            .where(Credential.status == status)
            .order_by(Credential.issued_at, Credential.id)
            .limit(limit)
            .offset(offset)
        )
        if org_id is not None:
            statement = statement.where(UserBadge.org_id == org_id)
        if badge_id is not None:
            statement = statement.where(Credential.badge_id == badge_id)
        result = await self._session.execute(statement)
        return list(result.scalars().all())

    async def get_by_internal_id(self, credential_id: uuid.UUID) -> Credential | None:
        """Admin review detail lookup by the internal id (the public verify URL uses the
        non-guessable public_id; the review queue is internal-only)."""
        result = await self._session.execute(
            select(Credential).where(Credential.id == credential_id)
        )
        return result.scalar_one_or_none()

    async def get_org_for_credential(self, credential_id: uuid.UUID) -> uuid.UUID | None:
        """The award org that owns this credential (via `user_badge`), used by the review
        routes to enforce org-admin scope before a transition."""
        result = await self._session.execute(
            select(UserBadge.org_id).where(UserBadge.credential_id == credential_id)
        )
        return result.scalar_one_or_none()

    async def transition_status(
        self,
        *,
        credential_id: uuid.UUID,
        previous_status: str,
        new_status: str,
        reviewer_id: uuid.UUID,
        org_id: uuid.UUID | None,
        reason: str | None,
    ) -> Credential | None:
        """Atomically move a credential to a new status with an immutable history row.

        The `WHERE status = previous_status` guard makes concurrent reviewers safe: if two
        admins review the same credential at once, exactly one sees its UPDATE match and the
        loser gets a zero-row result (the caller surfaces a 409). The status UPDATE and the
        history INSERT run in the same transaction — they commit or roll back together.
        """
        result = await self._session.execute(
            update(Credential)
            .where(
                Credential.id == credential_id,
                Credential.status == previous_status,
            )
            .values(status=new_status)
            .returning(Credential.id)
        )
        row = result.first()
        if row is None:
            return None

        # Python-side timestamp, not server_default: PostgreSQL's now() is frozen per
        # transaction, so multiple transitions inside one transaction (or the test suite's
        # savepoint-isolated session) would share a created_at and lose ordering. The guarded
        # UPDATE serializes transitions per credential, so Python timestamps are strictly
        # increasing and the append-only history reads back in decision order.
        history = CredentialStatusHistory(
            id=uuid.uuid4(),
            credential_id=credential_id,
            previous_status=previous_status,
            new_status=new_status,
            reviewer_id=reviewer_id,
            org_id=org_id,
            reason=reason,
            created_at=datetime.now(UTC),
        )
        self._session.add(history)
        await self._session.flush()
        updated = await self.get_by_internal_id(credential_id)
        return updated

    async def list_history(self, credential_id: uuid.UUID) -> list[CredentialStatusHistory]:
        """Immutable review history for one credential, oldest first — the append-only audit
        trail behind every status transition (B3)."""
        result = await self._session.execute(
            select(CredentialStatusHistory)
            .where(CredentialStatusHistory.credential_id == credential_id)
            .order_by(CredentialStatusHistory.created_at, CredentialStatusHistory.id)
        )
        return list(result.scalars().all())
