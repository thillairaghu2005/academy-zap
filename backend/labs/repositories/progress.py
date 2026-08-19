"""User lab progress repository (B6) — one learner's live notebook session per lab.

Ownership scoping mirrors judge's submission repository (F-5/F-6): every API-facing read
carries the caller's `user_id`/`org_id` so a foreign learner's progress is indistinguishable
from a missing one (404, no existence oracle). The worker path uses the unscoped reads.
"""

import uuid
from typing import Any

from sqlalchemy import ColumnElement, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from labs.models import UserLabProgress


class ProgressRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_for_user(
        self,
        lab_id: uuid.UUID,
        *,
        user_id: uuid.UUID,
        org_id: uuid.UUID | None,
    ) -> UserLabProgress | None:
        result = await self._session.execute(
            select(UserLabProgress)
            .where(
                UserLabProgress.lab_id == lab_id,
                UserLabProgress.user_id == user_id,
                _org_scope(UserLabProgress.org_id, org_id),
            )
            .options(selectinload(UserLabProgress.checkpoints))
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, progress_id: uuid.UUID) -> UserLabProgress | None:
        """Unscoped read — worker path only."""
        result = await self._session.execute(
            select(UserLabProgress).where(UserLabProgress.id == progress_id)
        )
        return result.scalar_one_or_none()

    async def get_owned(
        self,
        progress_id: uuid.UUID,
        *,
        user_id: uuid.UUID,
        org_id: uuid.UUID | None,
    ) -> UserLabProgress | None:
        result = await self._session.execute(
            select(UserLabProgress).where(
                UserLabProgress.id == progress_id,
                UserLabProgress.user_id == user_id,
                _org_scope(UserLabProgress.org_id, org_id),
            )
        )
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        lab_id: uuid.UUID,
        *,
        version_id: uuid.UUID,
        user_id: uuid.UUID,
        org_id: uuid.UUID | None,
    ) -> UserLabProgress:
        """Get the learner's session for a lab, creating it pinned to `version_id` on first
        touch. A transaction-scoped advisory lock serializes concurrent first-touches so the
        unique (lab_id, user_id) pair can never be violated (mirrors the enrollment pattern)."""
        await self._session.execute(
            select(
                func.pg_advisory_xact_lock(
                    func.hashtextextended(f"labprogress:{lab_id}:{user_id}", 0)
                )
            )
        )

        existing = await self._session.execute(
            select(UserLabProgress).where(
                UserLabProgress.lab_id == lab_id,
                UserLabProgress.user_id == user_id,
            )
        )
        progress = existing.scalar_one_or_none()
        if progress is not None:
            return progress

        progress = UserLabProgress(
            lab_id=lab_id,
            version_id=version_id,
            user_id=user_id,
            org_id=org_id,
            status="in_progress",
            code={},
            hints_used=0,
        )
        self._session.add(progress)
        await self._session.flush()
        return progress

    async def save_code(
        self,
        progress_id: uuid.UUID,
        code: dict[str, str],
    ) -> UserLabProgress | None:
        """Autosave: merge the learner's cell sources and bump updated_at.

        `updated_at` is set to an explicit Python timestamp so the ORM does not apply the
        column's server-side `onupdate` (which would expire the attribute and force a lazy
        refresh on the response path — the async MissingGreenlet trap)."""
        from datetime import UTC, datetime

        result = await self._session.execute(
            select(UserLabProgress).where(UserLabProgress.id == progress_id)
        )
        progress = result.scalar_one_or_none()
        if progress is None:
            return None
        progress.code = {**progress.code, **code}
        progress.updated_at = datetime.now(UTC)
        await self._session.flush()
        return progress

    async def mark_completed(
        self, progress_id: uuid.UUID, *, completed_at: object
    ) -> UserLabProgress | None:
        result = await self._session.execute(
            update(UserLabProgress)
            .where(UserLabProgress.id == progress_id, UserLabProgress.status == "in_progress")
            .values(status="completed", completed_at=completed_at, updated_at=func.now())
            .returning(UserLabProgress)
        )
        return result.scalar_one_or_none()


def _org_scope(column: Any, org_id: uuid.UUID | None) -> ColumnElement[bool]:
    """Tenant scoping predicate: NULL orgs match NULL, set orgs match exactly."""
    if org_id is None:
        return column.is_(None)  # type: ignore[no-any-return]
    return column == org_id  # type: ignore[no-any-return]