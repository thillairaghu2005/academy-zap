"""B3 — credential review queue + status transitions (gamification §7.4).

The admin review queue is the missing consumer of the Slice-08 `flagged` credential
status: flagged credentials route here, and a reviewer clears (flagged -> verified) or
revokes (flagged -> revoked; verified -> revoked is also supported for post-clear
reversals). Revocation NEVER deletes the credential — the public verify URL stays stable
and reports the current `revoked` status (gamification §7.3).

Authorization (fastapi-backend-sop.md §8): identity, role and org all come from the
authenticated token (AdminUser = org_admin | platform_ops), never from the request body.
Org admins are scoped to their own org's credentials; platform-ops sees every org.
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from gamification.repositories.badges import CredentialRepository
from platform_core.core.deps import AdminUser, DbSession
from platform_core.core.exceptions import ConflictError, PermissionDenied, ResourceNotFound
from platform_core.core.models.user import User
from platform_core.core.rbac import Role

router = APIRouter(prefix="/admin/reviews", tags=["admin", "gamification"])

# Explicit transition table — the server owns every allowed status change (B3). Anything
# outside these pairs is rejected. `revoked` is terminal: no transition out of it exists.
ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    "flagged": frozenset({"verified", "revoked"}),
    "verified": frozenset({"revoked"}),
}


class CredentialReviewRead(BaseModel):
    id: UUID
    public_id: str
    user_id: UUID
    badge_id: str
    credential_type: str
    status: str
    issuer: str
    source_event_id: UUID
    issued_at: datetime


class StatusHistoryRead(BaseModel):
    id: UUID
    previous_status: str
    new_status: str
    reviewer_id: UUID
    org_id: UUID | None
    reason: str | None
    created_at: datetime


class CredentialReviewDetailRead(CredentialReviewRead):
    history: list[StatusHistoryRead]


class TransitionBody(BaseModel):
    to_status: str = Field(pattern="^(verified|revoked)$")
    reason: str | None = Field(default=None, max_length=500)


class TransitionRead(BaseModel):
    id: UUID
    status: str
    history: list[StatusHistoryRead]


def _org_scope(admin_user: User) -> UUID | None:
    """Platform-ops sees all orgs; org admins are pinned to their own org. An org admin with
    no org is not allowed to review anything (same rule as the audit log route)."""
    role = Role(admin_user.role)
    if role == Role.PLATFORM_OPS:
        return None
    org_id = admin_user.org_id
    if org_id is None:
        raise PermissionDenied("Organization administrators must have an organization scope.")
    return org_id


@router.get("/credentials", response_model=list[CredentialReviewRead])
async def list_credential_reviews(
    session: DbSession,
    admin_user: AdminUser,
    status: str = Query(default="flagged", pattern="^(flagged|verified|revoked)$"),
    badge_id: str | None = Query(default=None, max_length=80),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[CredentialReviewRead]:
    """The review queue — flagged credentials needing a decision, optionally narrowed by
    badge type, org-scoped to the caller's org for org admins."""
    org_id = _org_scope(admin_user)
    rows = await CredentialRepository(session).list_for_review(
        status=status,
        org_id=org_id,
        badge_id=badge_id,
        limit=limit,
        offset=offset,
    )
    return [CredentialReviewRead.model_validate(row, from_attributes=True) for row in rows]


@router.get("/credentials/{credential_id}", response_model=CredentialReviewDetailRead)
async def get_credential_review(
    credential_id: UUID,
    session: DbSession,
    admin_user: AdminUser,
) -> CredentialReviewDetailRead:
    """One flagged credential with its full immutable review history — the reviewer's view.
    Exposes only credential/award data: no passwords, tokens, sessions or internal secrets."""
    repo = CredentialRepository(session)
    credential = await repo.get_by_internal_id(credential_id)
    if credential is None:
        raise ResourceNotFound("Credential was not found.")
    org_id = _org_scope(admin_user)
    if org_id is not None and (await repo.get_org_for_credential(credential_id)) != org_id:
        raise ResourceNotFound("Credential was not found.")
    history = await repo.list_history(credential_id)
    return CredentialReviewDetailRead(
        **CredentialReviewRead.model_validate(credential, from_attributes=True).model_dump(),
        history=[StatusHistoryRead.model_validate(h, from_attributes=True) for h in history],
    )


@router.post("/credentials/{credential_id}/transition", response_model=TransitionRead)
async def transition_credential_status(
    credential_id: UUID,
    body: TransitionBody,
    session: DbSession,
    admin_user: AdminUser,
) -> TransitionRead:
    """Move a credential through an allowed transition, atomically recording the decision.

    `to_status` is validated against the explicit ALLOWED_TRANSITIONS table and the
    credential's CURRENT status — a stale or forged transition fails with a 409 rather than
    silently overwriting reviewer A's decision with reviewer B's.
    """
    repo = CredentialRepository(session)
    credential = await repo.get_by_internal_id(credential_id)
    if credential is None:
        raise ResourceNotFound("Credential was not found.")

    org_id = _org_scope(admin_user)
    if org_id is not None and (await repo.get_org_for_credential(credential_id)) != org_id:
        raise ResourceNotFound("Credential was not found.")

    if body.to_status not in ALLOWED_TRANSITIONS.get(credential.status, frozenset()):
        raise ConflictError(
            f"Cannot transition credential from '{credential.status}' to '{body.to_status}'."
        )

    reviewer_org = org_id if org_id is not None else await repo.get_org_for_credential(
        credential_id
    )
    updated = await repo.transition_status(
        credential_id=credential_id,
        previous_status=credential.status,
        new_status=body.to_status,
        reviewer_id=admin_user.id,
        org_id=reviewer_org,
        reason=body.reason,
    )
    if updated is None:
        raise ConflictError(
            "Credential status changed while it was being reviewed — reload and retry."
        )
    await session.commit()
    history = await repo.list_history(credential_id)
    return TransitionRead(
        id=updated.id,
        status=updated.status,
        history=[StatusHistoryRead.model_validate(h, from_attributes=True) for h in history],
    )
