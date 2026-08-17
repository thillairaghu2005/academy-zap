"""Public credential verification (slice 08, Phase 10 — gamification §7.3).

`GET /verify/{credential_id}` is intentionally unauthenticated (SOP §8.1): it is the
permanent public URL behind every "verify this badge" link, and it independently
re-verifies the Ed25519 signature against the stored document. It is strictly read-only
and exposes only the fields the product's verify page is allowed to show — no passwords,
no tokens, no private learner data beyond the display name already public on leaderboards.

Verification semantics:
- Unknown credential_id, or a stored credential whose signature no longer verifies, is a
  404 — a credential that fails signature re-verification is indistinguishable from a
  forged screenshot, so the verify URL reports it as not-found.
- Otherwise the response reflects CURRENT truth at the stable URL: verified / flagged
  (frozen pending review) / revoked (when the B3 review queue later reverses the
  underlying ledger entries).
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from gamification.integrity.credentials import verify_vc
from gamification.repositories.badges import CredentialRepository
from platform_core.core.deps import DbSession
from platform_core.core.exceptions import ResourceNotFound
from platform_core.core.rate_limiting import CompatibleRateLimiter
from platform_core.core.rate_limits import PUBLIC_RATE_LIMIT

router = APIRouter(tags=["gamification"])

# The public verify URL is unauthenticated by design (SOP §8.1) — it gets the same public
# rate limit as the other unauthenticated read endpoints (slice 08 security review, required
# fix 1).
_public_rate_limit = CompatibleRateLimiter(
    times=PUBLIC_RATE_LIMIT.times,
    seconds=PUBLIC_RATE_LIMIT.seconds,
)


class CredentialSubjectRead(BaseModel):
    user_id: str
    display_name: str


class CredentialClaimRead(BaseModel):
    category: str
    earned_at: datetime
    level: int
    rank_name: str


class CredentialVerifyRead(BaseModel):
    """The locked frontend `BadgeVerifyResult` contract (lib/contracts/gamification.ts)."""

    credential_id: str
    badge_name: str
    issuer: str
    subject: CredentialSubjectRead
    claim: CredentialClaimRead
    signature: str
    status: str
    note: str


@router.get(
    "/verify/{credential_id}",
    response_model=CredentialVerifyRead,
    dependencies=[Depends(_public_rate_limit)],
)
async def verify_credential(credential_id: str, session: DbSession) -> CredentialVerifyRead:
    credential = await CredentialRepository(session).get_by_public_id(credential_id)
    if credential is None:
        raise ResourceNotFound("Credential was not found.")

    # Independent re-verification of the stored document + signature (Phase 10). A tampered
    # stored credential fails here and is served as not-found (forged-screenshot semantics).
    if verify_vc(credential.claim, credential.signature) != "verified":
        raise ResourceNotFound("Credential was not found.")

    subject: dict[str, Any] = credential.claim.get("credentialSubject", {})
    # The frontend `BadgeVerifyResult.claim` is derived from the signed subject — the values
    # shown on the verify page are exactly the values the signature covers.
    claim: dict[str, Any] = {
        "category": subject.get("category", ""),
        "earned_at": subject.get("earnedAt"),
        "level": subject.get("level", 1),
        "rank_name": subject.get("rankName", "Initiate"),
    }
    notes: dict[str, str] = {
        "verified": (
            "Signature valid — this credential is backed by an intact Zapsters ledger "
            "and the hash-chained records behind it."
        ),
        "flagged": (
            "Pending integrity review — the underlying ledger entries were flagged. "
            "Public display is frozen until review clears."
        ),
        "revoked": (
            "Revoked — the underlying ledger entries were reversed (admin-reviewed "
            "adjustment). This credential no longer certifies anything."
        ),
    }
    return CredentialVerifyRead(
        credential_id=credential.public_id,
        badge_name=str(subject.get("name", credential.badge_id)),
        issuer=credential.issuer,
        subject=CredentialSubjectRead(
            user_id=str(subject.get("id", str(credential.user_id))),
            display_name=str(subject.get("displayName", "Learner")),
        ),
        claim=CredentialClaimRead(
            category=str(claim["category"]),
            earned_at=(
                claim["earned_at"] if claim["earned_at"] is not None else credential.issued_at
            ),
            level=int(claim["level"]),
            rank_name=str(claim["rank_name"]),
        ),
        signature=credential.signature,
        status=credential.status,
        note=notes.get(credential.status, "Credential status is available at this stable URL."),
    )
