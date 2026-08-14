"""The mandatory regression table, gamification §8.3, transcribed verbatim as one frozen
acceptance fixture:

    resolve_rank(completion_xp=0, mastery_xp=0)          -> (Level.INITIATE, "Initiate")
    resolve_rank(completion_xp=36000, mastery_xp=36000)  -> (Level.DEUS, "Deus")
    apply_streak_decay(gap_days=1, has_freeze_token=True)  -> streak preserved, token consumed
    apply_streak_decay(gap_days=1, has_freeze_token=False) -> streak broken
    verify_ledger_chain(tampered_middle_entry=True)         -> raises ChainIntegrityError
    credential_verify(valid_signature=True)                  -> status="verified"
    credential_verify(tampered_payload=True)                  -> status="invalid"

The two `credential_verify` cases are a known, temporary gap: `integrity/credentials.py`
(Ed25519-signed W3C Verifiable Credentials, gamification §7.3) is explicitly out of scope this
round — see build.md B4. They are xfailed rather than omitted, so the gap stays visible in test
output instead of silently disappearing, and turn green the moment `credentials.py` exists.

This file exists specifically so a future refactor of the resolver/rank/streak/hash-chain
modules can't silently change what these five cases mean (build.md §8.2's acceptance-fixture
rule) — the individual unit tests in `tests/unit/` cover broader behavior; this one is the
doc's own literal table, kept in one place for direct traceability.
"""

import uuid
from datetime import UTC, datetime

import pytest

from gamification.context.rank import Level, resolve_rank
from gamification.context.streaks import apply_streak_decay
from gamification.integrity.ledger_hash import (
    GENESIS_HASH,
    ChainedEntry,
    HashableEntry,
    compute_entry_hash,
    verify_chain,
)
from platform_core.core.exceptions import ChainIntegrityError


def test_resolve_rank_regression_table() -> None:
    assert resolve_rank(completion_xp=0, mastery_xp=0) == (Level.INITIATE, "Initiate")
    assert resolve_rank(completion_xp=36_000, mastery_xp=36_000) == (Level.DEUS, "Deus")


def test_apply_streak_decay_regression_table() -> None:
    preserved = apply_streak_decay(gap_days=1, has_freeze_token=True)
    assert preserved.preserved is True
    assert preserved.token_consumed is True

    broken = apply_streak_decay(gap_days=1, has_freeze_token=False)
    assert broken.preserved is False
    assert broken.token_consumed is False


def test_verify_ledger_chain_tampered_middle_entry_raises() -> None:
    def _entry(xp_delta: int) -> HashableEntry:
        return HashableEntry(
            user_id=uuid.uuid4(), xp_delta=xp_delta, reason_code="X", created_at=datetime.now(UTC)
        )

    entries = [_entry(100), _entry(50), _entry(200)]
    chained = []
    prev_hash = GENESIS_HASH
    for entry in entries:
        entry_hash = compute_entry_hash(prev_hash, entry)
        chained.append(ChainedEntry(entry=entry, prev_hash=prev_hash, entry_hash=entry_hash))
        prev_hash = entry_hash

    tampered = chained[1].entry
    chained[1] = ChainedEntry(
        entry=HashableEntry(
            user_id=tampered.user_id,
            xp_delta=999_999,
            reason_code=tampered.reason_code,
            created_at=tampered.created_at,
        ),
        prev_hash=chained[1].prev_hash,
        entry_hash=chained[1].entry_hash,
    )

    with pytest.raises(ChainIntegrityError):
        verify_chain(chained)


@pytest.mark.xfail(
    reason="integrity/credentials.py (gamification §7.3) is out of scope this round — build.md B4",
    strict=True,
)
def test_credential_verify_valid_signature() -> None:
    from gamification.integrity.credentials import credential_verify  # type: ignore

    assert credential_verify(valid_signature=True).status == "verified"


@pytest.mark.xfail(
    reason="integrity/credentials.py (gamification §7.3) is out of scope this round — build.md B4",
    strict=True,
)
def test_credential_verify_tampered_payload() -> None:
    from gamification.integrity.credentials import credential_verify

    assert credential_verify(tampered_payload=True).status == "invalid"
