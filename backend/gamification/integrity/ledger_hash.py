"""Ledger hash-chaining — tamper evidence (gamification §7.2).

A lightweight, in-house hash chain (not a blockchain — single writer, no consensus needed).
`verify_chain` is what the Progress Context Engine's resolver calls before trusting a recompute;
a broken link is a P0 — it raises, it never logs a warning and continues.
"""

import hashlib
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from platform_core.core.exceptions import ChainIntegrityError

GENESIS_HASH = "0" * 64


@dataclass(frozen=True)
class HashableEntry:
    """The subset of `LedgerEntry` fields that feed the hash — see gamification §7.2."""

    user_id: UUID
    xp_delta: int
    reason_code: str
    created_at: datetime


def compute_entry_hash(prev_hash: str, entry: HashableEntry) -> str:
    """Verbatim formula from gamification §7.2."""
    payload = (
        f"{prev_hash}|{entry.user_id}|{entry.xp_delta}|{entry.reason_code}|"
        f"{entry.created_at.isoformat()}"
    )
    return hashlib.sha256(payload.encode()).hexdigest()


@dataclass(frozen=True)
class ChainedEntry:
    entry: HashableEntry
    prev_hash: str
    entry_hash: str


def verify_chain(entries: list[ChainedEntry]) -> None:
    """Verifies a chain segment in order (oldest first). Raises `ChainIntegrityError` on the
    first broken link — a direct-DB tamper attempt or a write-path bug, never distinguishable
    from the hash alone, and treated identically: halt, don't guess.
    """
    expected_prev = GENESIS_HASH
    for position, chained in enumerate(entries):
        if chained.prev_hash != expected_prev:
            raise ChainIntegrityError(
                f"prev_hash mismatch at position {position}: "
                f"expected {expected_prev}, got {chained.prev_hash}"
            )
        recomputed = compute_entry_hash(chained.prev_hash, chained.entry)
        if recomputed != chained.entry_hash:
            raise ChainIntegrityError(
                f"entry_hash mismatch at position {position}: tampered entry or corrupted write"
            )
        expected_prev = chained.entry_hash
