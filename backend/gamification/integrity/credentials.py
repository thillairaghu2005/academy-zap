"""Verifiable credentials (gamification §7.3) — Ed25519-signed W3C-VC-shaped documents.

A badge/credential is never *just* an image: on issuance the issuer produces a
W3C-Verifiable-Credential-shaped JSON document (issuer = Zapsters, subject = user,
claim = the badge/achievement, timestamp) and signs it with an Ed25519 key held
server-side only. The public verify URL independently re-verifies the signature and
always reflects current status (verified / flagged / revoked) at the stable URL.

Implementation notes (documented slice-08 decisions — the source doc pins the *shape* and
the signing scheme but not the key-management mechanics):

- Signing scheme: the doc's stack table pins "`vc-jwt` pattern via PyJWT + Ed25519
  (`pynacl`)". PyJWT's `EdDSA` algorithm implements exactly that Ed25519 JWS signing and
  is satisfied by the `cryptography` backend already pinned in the environment, so no
  additional dependency is added; the produced signature is a standard Ed25519 compact
  JWS. (Adding `pynacl` solely to feed PyJWT would duplicate a backend already present.)
- Key management: the issuer key is derived deterministically from `SECRET_KEY`
  (HMAC-SHA256 with a fixed purpose salt). Every worker/process shares one issuer key
  without a KMS dependency, and the key survives restarts (credentials keep verifying).
  A dedicated KMS/secret-store rotation is deferred — out of scope for this slice.
- `credential_verify()` is the mandatory regression-table entry point (gamification
  §8.3): `credential_verify(valid_signature=True).status == "verified"` and
  `credential_verify(tampered_payload=True).status == "invalid"`.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import jwt as pyjwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

from platform_core.core.config import settings

ISSUER_ID = "https://zapsters.dev"
ISSUER_NAME = "Zapsters"

VC_CONTEXT = ["https://www.w3.org/2018/credentials/v1"]
VC_TYPE = ["VerifiableCredential", "ZapstersBadgeCredential"]

# Purpose-separated salt for the deterministic issuer key (never the JWT signing secret).
_ISSUER_KEY_SALT = b"zapsters-credential-issuer-v1"
_JWS_ALGORITHM = "EdDSA"


def _issuer_seed() -> bytes:
    """Deterministic 32-byte Ed25519 seed derived from SECRET_KEY. All processes/workers in
    one deployment share the same issuer key; the key survives restarts so previously issued
    credentials keep verifying."""
    secret = settings.SECRET_KEY.get_secret_value().encode()
    return hmac.new(secret, _ISSUER_KEY_SALT, hashlib.sha256).digest()


def _private_key() -> Ed25519PrivateKey:
    return Ed25519PrivateKey.from_private_bytes(_issuer_seed())


def _private_key_pem() -> bytes:
    return _private_key().private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )


def _public_key_pem() -> bytes:
    return _public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )


def _public_key() -> Ed25519PublicKey:
    return _private_key().public_key()


def _canonical(payload: dict[str, Any]) -> str:
    """Canonical JSON used for the tamper comparison — ordering-independent and
    deterministic across processes."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def build_vc(
    *,
    public_id: str,
    user_id: str,
    display_name: str,
    badge_id: str,
    badge_name: str,
    category: str,
    level: int,
    rank_name: str,
    earned_at: datetime,
    verify_path: str,
) -> dict[str, Any]:
    """The W3C-Verifiable-Credential-shaped document (§7.3). `verify_path` is the stable
    relative verify URL on the platform (the frontend routes `/verify/{public_id}` inside
    its own tree — see the slice-08 report for why the relative path is used)."""
    return {
        "@context": VC_CONTEXT,
        "id": f"urn:uuid:{public_id}",
        "type": VC_TYPE,
        "issuer": {"id": ISSUER_ID, "name": ISSUER_NAME},
        "issuanceDate": datetime.now(UTC).isoformat(),
        "credentialSubject": {
            "id": str(user_id),
            "displayName": display_name,
            "achievement": badge_id,
            "name": badge_name,
            "category": category,
            "level": level,
            "rankName": rank_name,
            "earnedAt": earned_at.isoformat(),
        },
        "credentialStatus": {"id": verify_path, "type": "ZapstersCredentialStatus"},
    }


def sign_vc(vc: dict[str, Any]) -> str:
    """Sign a credential document with the server-held Ed25519 key (compact JWS)."""
    return pyjwt.encode(vc, _private_key_pem(), algorithm=_JWS_ALGORITHM)


def verify_vc(vc: dict[str, Any], signature: str) -> str:
    """Independently re-verify a presented document + signature. Returns `"verified"` when
    the signature is valid AND the presented document exactly matches the signed payload;
    returns `"invalid"` on any tampering (including a re-signed payload from a different
    key, since only the issuer's public key verifies)."""
    try:
        payload = pyjwt.decode(signature, _public_key_pem(), algorithms=[_JWS_ALGORITHM])
    except pyjwt.PyJWTError:
        return "invalid"
    if not isinstance(payload, dict):
        return "invalid"
    if _canonical(payload) != _canonical(vc):
        return "invalid"
    return "verified"


@dataclass(frozen=True)
class VerifyOutcome:
    status: str


def credential_verify(
    *, valid_signature: bool = True, tampered_payload: bool = False
) -> VerifyOutcome:
    """The mandatory regression-table entry point (gamification §8.3). Pure and
    deterministic:

        credential_verify(valid_signature=True)  -> status="verified"
        credential_verify(tampered_payload=True)  -> status="invalid"

    `valid_signature=False` signs with a foreign key (simulating a forger) so the result is
    `invalid` even when the payload is untouched.
    """
    vc = build_vc(
        public_id="regression-table-fixture",
        user_id="00000000-0000-4000-8000-000000000000",
        display_name="Regression Learner",
        badge_id="regression_badge",
        badge_name="Regression Badge",
        category="testing",
        level=1,
        rank_name="Initiate",
        earned_at=datetime.now(UTC),
        verify_path="/verify/regression-table-fixture",
    )
    if valid_signature:
        signature = sign_vc(vc)
    else:
        # A foreign key: same algorithm, different seed — the signature will not verify.
        import uuid

        foreign = Ed25519PrivateKey.from_private_bytes(
            hashlib.sha256(uuid.uuid4().bytes).digest()
        )
        signature = pyjwt.encode(
            vc,
            foreign.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            ),
            algorithm=_JWS_ALGORITHM,
        )
    if tampered_payload:
        vc = {**vc, "issuanceDate": "1999-01-01T00:00:00+00:00"}
    return VerifyOutcome(status=verify_vc(vc, signature))
