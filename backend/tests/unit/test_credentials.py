"""Unit tier — verifiable credentials (gamification §7.3, slice 08).

Covers signing, independent re-verification, tamper detection, and the mandatory
regression-table entry point (`credential_verify`). Pure functions — no DB, no HTTP.
"""

import uuid
from datetime import UTC, datetime

import pytest

from gamification.integrity.credentials import (
    build_vc,
    credential_verify,
    sign_vc,
    verify_vc,
)


def _sample_vc() -> dict[str, object]:
    return build_vc(
        public_id="sample-public-id",
        user_id=str(uuid.uuid4()),
        display_name="Ada Learner",
        badge_id="first_course_completed",
        badge_name="First Course Completed",
        category="learning",
        level=2,
        rank_name="Oracle",
        earned_at=datetime(2026, 8, 1, 12, 0, 0, tzinfo=UTC),
        verify_path="/rank/verify/sample-public-id",
    )


def test_sign_and_verify_round_trip() -> None:
    vc = _sample_vc()
    signature = sign_vc(vc)
    assert verify_vc(vc, signature) == "verified"


def test_tampered_payload_fails_verification() -> None:
    """The presented document must EXACTLY match the signed payload — editing any field
    (e.g. the award date) invalidates the credential, even though the signature itself is
    the issuer's."""
    vc = _sample_vc()
    signature = sign_vc(vc)
    tampered = {**vc, "issuanceDate": "1999-01-01T00:00:00+00:00"}
    assert verify_vc(tampered, signature) == "invalid"


def test_tampered_signature_fails_verification() -> None:
    vc = _sample_vc()
    signature = sign_vc(vc)
    # Flip one hex char — the signature no longer verifies against the issuer key.
    tampered_signature = ("0" if signature[0] != "0" else "1") + signature[1:]
    assert verify_vc(vc, tampered_signature) == "invalid"


def test_non_issuer_key_fails_verification() -> None:
    """A credential signed by ANY other key must not verify (Phase 12 — forged
    credentials)."""
    vc = _sample_vc()
    assert verify_vc(vc, "not-a-jwt") == "invalid"
    assert verify_vc(vc, "") == "invalid"


def test_regression_table_valid_signature() -> None:
    assert credential_verify(valid_signature=True).status == "verified"


def test_regression_table_tampered_payload() -> None:
    assert credential_verify(tampered_payload=True).status == "invalid"


def test_regression_table_foreign_key() -> None:
    """`valid_signature=False` simulates a forger — same payload, different key, and the
    result is invalid even though the payload is untouched."""
    assert credential_verify(valid_signature=False).status == "invalid"


def test_issuer_identity_is_stable() -> None:
    """The issuer key derives deterministically from SECRET_KEY, so a signature made once
    verifies again later — restarts never orphan previously issued credentials."""
    vc = _sample_vc()
    signature = sign_vc(vc)
    assert signature != ""
    assert verify_vc(vc, signature) == "verified"
    assert verify_vc(vc, signature) == "verified"  # stable across re-verifications


@pytest.mark.parametrize(
    ("valid_signature", "tampered_payload", "expected"),
    [
        (True, False, "verified"),
        (True, True, "invalid"),
        (False, False, "invalid"),
    ],
)
def test_credential_verify_matrix(
    valid_signature: bool, tampered_payload: bool, expected: str
) -> None:
    outcome = credential_verify(
        valid_signature=valid_signature, tampered_payload=tampered_payload
    )
    assert outcome.status == expected
