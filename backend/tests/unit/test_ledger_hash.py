"""Unit tier: the hash-chain compute/verify functions (gamification §7.2), pure and DB-free."""

import uuid
from datetime import UTC, datetime

import pytest

from gamification.integrity.ledger_hash import (
    GENESIS_HASH,
    ChainedEntry,
    HashableEntry,
    compute_entry_hash,
    verify_chain,
)
from platform_core.core.exceptions import ChainIntegrityError


def _entry(*, xp_delta: int = 100, reason_code: str = "COURSE_COMPLETE") -> HashableEntry:
    return HashableEntry(
        user_id=uuid.uuid4(),
        xp_delta=xp_delta,
        reason_code=reason_code,
        created_at=datetime.now(UTC),
    )


def test_compute_entry_hash_is_deterministic() -> None:
    entry = _entry()
    assert compute_entry_hash(GENESIS_HASH, entry) == compute_entry_hash(GENESIS_HASH, entry)


def test_compute_entry_hash_changes_with_prev_hash() -> None:
    entry = _entry()
    assert compute_entry_hash(GENESIS_HASH, entry) != compute_entry_hash("a" * 64, entry)


def test_verify_chain_accepts_a_valid_chain() -> None:
    entries = [
        _entry(xp_delta=100),
        _entry(xp_delta=50),
        _entry(xp_delta=-10, reason_code="ADJUSTMENT"),
    ]

    chained = []
    prev_hash = GENESIS_HASH
    for entry in entries:
        entry_hash = compute_entry_hash(prev_hash, entry)
        chained.append(ChainedEntry(entry=entry, prev_hash=prev_hash, entry_hash=entry_hash))
        prev_hash = entry_hash

    verify_chain(chained)  # must not raise


def test_verify_chain_rejects_a_tampered_middle_entry() -> None:
    """The mandatory case from gamification §8.3: verify_ledger_chain(tampered_middle_entry=True)
    -> raises ChainIntegrityError.
    """
    entries = [_entry(xp_delta=100), _entry(xp_delta=50), _entry(xp_delta=200)]

    chained = []
    prev_hash = GENESIS_HASH
    for entry in entries:
        entry_hash = compute_entry_hash(prev_hash, entry)
        chained.append(ChainedEntry(entry=entry, prev_hash=prev_hash, entry_hash=entry_hash))
        prev_hash = entry_hash

    # Tamper with the middle entry's xp_delta after its hash was already computed.
    tampered_middle = ChainedEntry(
        entry=HashableEntry(
            user_id=chained[1].entry.user_id,
            xp_delta=999_999,
            reason_code=chained[1].entry.reason_code,
            created_at=chained[1].entry.created_at,
        ),
        prev_hash=chained[1].prev_hash,
        entry_hash=chained[1].entry_hash,
    )
    chained[1] = tampered_middle

    with pytest.raises(ChainIntegrityError):
        verify_chain(chained)


def test_verify_chain_rejects_a_broken_prev_hash_link() -> None:
    entries = [_entry(), _entry()]
    chained = [
        ChainedEntry(
            entry=entries[0],
            prev_hash=GENESIS_HASH,
            entry_hash=compute_entry_hash(GENESIS_HASH, entries[0]),
        ),
        ChainedEntry(
            entry=entries[1],
            prev_hash="0" * 64,
            entry_hash=compute_entry_hash("0" * 64, entries[1]),
        ),
    ]

    with pytest.raises(ChainIntegrityError):
        verify_chain(chained)


def test_verify_chain_rejects_a_forged_genesis_hash() -> None:
    entry = _entry()
    forged_prev_hash = "a" * 64
    forged = ChainedEntry(
        entry=entry,
        prev_hash=forged_prev_hash,
        entry_hash=compute_entry_hash(forged_prev_hash, entry),
    )

    with pytest.raises(ChainIntegrityError):
        verify_chain([forged])
