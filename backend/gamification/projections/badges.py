"""Badge eligibility evaluation + issuance (gamification §5.5, §7.3 — slice 08).

The backend is authoritative for every badge and credential:

    authoritative event / ProgressContext
        -> deterministic eligibility (this module)
        -> idempotent award (UNIQUE(user_id, badge_id) in the DB)
        -> signed credential (gamification.integrity.credentials)

The frontend never decides eligibility — there is no award endpoint, and the read API only
serves what this evaluator (running inside the event pipeline) wrote.

Eligibility is event-driven and evaluates only the minimal set of definitions a given
authoritative signal can touch (Phase 14): `course_completed` triggers only on
CourseCompletedEvent, `assessment_submitted` only on AssessmentSubmittedEvent, and the two
state-milestone triggers (streak, rank) are re-checked against the freshly resolved
ProgressContext after any XP-bearing event. No page load, no request, and no
"evaluate every badge for every user" pass exists.

The catalog itself (what badges exist, their thresholds) lives in the seeded
`badge_definition` table — the source docs define the badge *mechanism* but not a catalog,
so the four seeded definitions are the smallest deterministic set mapped to already-existing
authoritative signals (documented in the slice-08 report).
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from gamification.context.schema import ProgressContext
from gamification.integrity.credentials import build_vc, sign_vc
from gamification.models import BadgeDefinition, UserBadge
from gamification.repositories.badges import (
    BadgeDefinitionRepository,
    CredentialRepository,
    UserBadgeRepository,
    generate_public_id,
)
from platform_core.core.repositories.user import UserRepository
from platform_core.events.schema import (
    AssessmentSubmittedEvent,
    BaseEvent,
    CourseCompletedEvent,
)

# Trigger literals — must match the seeded `badge_definition.trigger` values.
TRIGGER_COURSE_COMPLETED = "course_completed"
TRIGGER_ASSESSMENT_SUBMITTED = "assessment_submitted"
TRIGGER_STREAK_MILESTONE = "streak_milestone"
TRIGGER_RANK_MILESTONE = "rank_milestone"

# The relative verify path prefix — the frontend routes /verify/{public_id} inside its own
# tree (/rank/verify/...); the backend returns the same relative path so the locked UI's
# router.push(verify_url) works in both modes (documented in the slice-08 report).
VERIFY_PATH_PREFIX = "/rank/verify"


class BadgeEvaluator:
    """Deterministic, event-driven badge evaluation + credential issuance. Runs inside the
    same transaction as the ledger append, so the per-user advisory lock already serializes
    concurrent event processing (the DB unique constraints remain the hard guarantee)."""

    def __init__(self, session: AsyncSession) -> None:
        self._definitions = BadgeDefinitionRepository(session)
        self._awards = UserBadgeRepository(session)
        self._credentials = CredentialRepository(session)
        self._users = UserRepository(session)

    async def evaluate_and_award(
        self, *, event: BaseEvent, context: ProgressContext
    ) -> list[UserBadge]:
        """Evaluate the minimal applicable definitions for this event/context and award any
        newly eligible badges (issuing a signed credential per award). Returns the awards
        created in this call — replayed events and already-awarded badges return nothing."""
        definitions = await self._definitions.list_enabled()
        awarded: list[UserBadge] = []
        for definition in definitions:
            if not self._triggered(definition, event):
                continue
            if await self._awards.has_award(event.user_id, definition.badge_id):
                continue
            if not self._eligible(definition, event, context):
                continue
            award = await self._award(definition=definition, event=event, context=context)
            if award is not None:
                awarded.append(award)
        return awarded

    # -- eligibility ---------------------------------------------------------------

    @staticmethod
    def _triggered(definition: BadgeDefinition, event: BaseEvent) -> bool:
        """Which authoritative signal can make this definition eligible? Streak/rank
        milestones are re-checked against the freshly resolved context after any
        XP-bearing event (course or assessment) — no polling, no page-load evaluation."""
        trigger = definition.trigger
        if trigger == TRIGGER_COURSE_COMPLETED:
            return isinstance(event, CourseCompletedEvent)
        if trigger == TRIGGER_ASSESSMENT_SUBMITTED:
            return isinstance(event, AssessmentSubmittedEvent)
        if trigger in (TRIGGER_STREAK_MILESTONE, TRIGGER_RANK_MILESTONE):
            return isinstance(event, (CourseCompletedEvent, AssessmentSubmittedEvent))
        return False

    @staticmethod
    def _eligible(definition: BadgeDefinition, event: BaseEvent, context: ProgressContext) -> bool:
        """Deterministic threshold evaluation against authoritative state only — the event
        payload (server-validated) and the freshly resolved ProgressContext. Never client
        state, never timestamps from the browser."""
        threshold: dict[str, Any] = definition.threshold or {}
        trigger = definition.trigger
        if trigger == TRIGGER_COURSE_COMPLETED:
            # Any course completion is eligible; the idempotency invariant (one award per
            # user+badge) is what makes this "first course" rather than "every course".
            return True
        if trigger == TRIGGER_ASSESSMENT_SUBMITTED:
            if not isinstance(event, AssessmentSubmittedEvent):
                return False
            min_score_pct = float(threshold.get("min_score_pct", 100))
            return event.score_pct >= min_score_pct
        if trigger == TRIGGER_STREAK_MILESTONE:
            return context.streak.current_streak_days >= int(threshold.get("min_streak_days", 7))
        if trigger == TRIGGER_RANK_MILESTONE:
            return context.rank.level >= int(threshold.get("min_level", 3))
        return False

    # -- issuance ------------------------------------------------------------------

    async def _award(
        self, *, definition: BadgeDefinition, event: BaseEvent, context: ProgressContext
    ) -> UserBadge | None:
        """Create the signed credential first, then the award row referencing it. A badge
        awarded for an event whose ledger entry is flagged gets a `flagged` credential
        (public display frozen pending review, gamification §7.4) — private state still
        accrues, exactly like XP."""
        user = await self._users.get_by_id(event.user_id)
        display_name = user.display_name if user else "Learner"

        public_id = generate_public_id()
        verify_path = f"{VERIFY_PATH_PREFIX}/{public_id}"
        earned_at = datetime.now(UTC)
        vc = build_vc(
            public_id=public_id,
            user_id=str(event.user_id),
            display_name=display_name,
            badge_id=definition.badge_id,
            badge_name=definition.name,
            category=definition.category,
            level=context.rank.level,
            rank_name=context.rank.rank_name,
            earned_at=earned_at,
            verify_path=verify_path,
        )
        signature = sign_vc(vc)
        status = "flagged" if context.freeze_status == "frozen_pending_review" else "verified"

        credential = await self._credentials.issue(
            public_id=public_id,
            user_id=event.user_id,
            badge_id=definition.badge_id,
            claim=vc,
            signature=signature,
            source_event_id=event.event_id,
        )
        credential.status = status

        return await self._awards.award(
            user_id=event.user_id,
            badge_id=definition.badge_id,
            source_event_id=event.event_id,
            credential_id=credential.id,
            org_id=event.org_id,
        )

    # -- read model ----------------------------------------------------------------

    async def list_badges_for_user(self, user_id: uuid.UUID) -> list[dict[str, Any]]:
        """The badge wall read model — the locked frontend `Badge` contract. Status and
        verify identity come from the signed credential (current truth at the stable URL),
        not from any client-supplied state."""
        awards = await self._awards.list_for_user(user_id)
        if not awards:
            return []

        definitions = {d.badge_id: d for d in await self._definitions.list_all()}
        credentials = {
            c.id: c
            for c in await self._credentials.get_by_ids(
                [a.credential_id for a in awards if a.credential_id is not None]
            )
        }

        badges: list[dict[str, Any]] = []
        for award in awards:
            definition = definitions.get(award.badge_id)
            credential = credentials.get(award.credential_id) if award.credential_id else None
            if definition is None:
                continue
            public_id = credential.public_id if credential else award.badge_id
            badges.append(
                {
                    "badge_id": award.badge_id,
                    "name": definition.name,
                    "description": definition.description,
                    "credential_id": public_id,
                    "verify_url": f"{VERIFY_PATH_PREFIX}/{public_id}",
                    "earned_at": award.awarded_at,
                    "status": credential.status if credential else "verified",
                    "category": definition.category,
                }
            )
        return badges
