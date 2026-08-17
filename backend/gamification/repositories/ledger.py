import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.integrity.ledger_hash import (
    GENESIS_HASH,
    ChainedEntry,
    HashableEntry,
    compute_entry_hash,
    verify_chain,
)
from gamification.models import LedgerEntry


class LedgerRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_user(self, user_id: uuid.UUID) -> list[LedgerEntry]:
        result = await self._session.execute(
            select(LedgerEntry)
            .where(LedgerEntry.user_id == user_id)
            .order_by(LedgerEntry.created_at, LedgerEntry.id)
        )
        return list(result.scalars().all())

    async def get_by_event_id(
        self, *, user_id: uuid.UUID, event_id: uuid.UUID
    ) -> LedgerEntry | None:
        result = await self._session.execute(
            select(LedgerEntry).where(
                LedgerEntry.user_id == user_id,
                LedgerEntry.event_id == event_id,
            )
        )
        return result.scalar_one_or_none()

    async def append(
        self,
        *,
        user_id: uuid.UUID,
        event_id: uuid.UUID,
        xp_type: str,
        xp_delta: int,
        reason_code: str,
        multiplier_applied: float = 1.0,
        integrity_status: str = "verified",
        org_id: uuid.UUID | None = None,
        source_type: str | None = None,
        source_id: uuid.UUID | None = None,
    ) -> LedgerEntry:
        """Appends one entry, computing its hash against the user's latest entry. This is the
        ONLY function in the codebase permitted to write to `xp_ledger` — every score-affecting
        code path must go through it (gamification §2.6's zero-exception rule).
        """
        # Serialize writers per user. Without a transaction-scoped advisory lock, two concurrent
        # event deliveries can both observe the same tail and fork the hash chain.
        await self._session.execute(
            select(func.pg_advisory_xact_lock(func.hashtextextended(str(user_id), 0)))
        )

        duplicate = await self.get_by_event_id(user_id=user_id, event_id=event_id)
        if duplicate is not None:
            return duplicate

        existing = await self.list_for_user(user_id)
        prev_hash = existing[-1].entry_hash if existing else GENESIS_HASH

        created_at = datetime.now(UTC)
        if existing and created_at <= existing[-1].created_at:
            created_at = existing[-1].created_at + timedelta(microseconds=1)
        hashable = HashableEntry(
            user_id=user_id, xp_delta=xp_delta, reason_code=reason_code, created_at=created_at
        )
        entry_hash = compute_entry_hash(prev_hash, hashable)

        entry = LedgerEntry(
            id=uuid.uuid4(),
            user_id=user_id,
            event_id=event_id,
            xp_type=xp_type,
            xp_delta=xp_delta,
            reason_code=reason_code,
            multiplier_applied=multiplier_applied,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
            created_at=created_at,
            integrity_status=integrity_status,
            org_id=org_id,
            source_type=source_type,
            source_id=source_id,
        )
        self._session.add(entry)
        await self._session.flush()
        return entry

    async def verify_chain_for_user(self, user_id: uuid.UUID) -> None:
        """Raises `ChainIntegrityError` (via `verify_chain`) on the first broken link."""
        entries = await self.list_for_user(user_id)
        chained = [
            ChainedEntry(
                entry=HashableEntry(
                    user_id=e.user_id,
                    xp_delta=e.xp_delta,
                    reason_code=e.reason_code,
                    created_at=e.created_at,
                ),
                prev_hash=e.prev_hash,
                entry_hash=e.entry_hash,
            )
            for e in entries
        ]
        verify_chain(chained)
