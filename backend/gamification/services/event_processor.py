"""Server-authoritative domain-event to ledger processing.

The event processor is the only application path that turns platform activity into XP. Routes and
frontend state never provide an XP amount or mutate rank state directly.

Slice 08 adds the badge/credential stage to the same authoritative path: after the ledger
append and ProgressContext resolution, the minimal applicable badge definitions are evaluated
and any new awards are issued with signed credentials (gamification §7.3). Replayed events go
through the idempotency marker and never re-enter this path, and the database-level
uniqueness invariants make duplicate awards impossible even under concurrent delivery.
"""

from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from gamification.context.resolver import ProgressContextResolver
from gamification.context.schema import ProgressContext
from gamification.integrity.gate import IntegritySignals, run_integrity_gate
from gamification.models import UserBadge
from gamification.projections.badges import BadgeEvaluator
from gamification.repositories.ledger import LedgerRepository
from gamification.rules import (
    ANSWER_TIMING_MIN_MS_PER_QUESTION,
    ASSESSMENT_MAX_MASTERY_XP,
    COURSE_COMPLETION_XP,
    JUDGE_PROBLEM_MASTERY_XP,
    SIDE_ASSESSMENT_MULTIPLIER,
)
from platform_core.events.schema import (
    AssessmentSubmittedEvent,
    BaseEvent,
    CourseCompletedEvent,
    JudgeSubmissionGradedEvent,
)


@dataclass
class EventProcessResult:
    """The outcome of processing one authoritative event.

    `context` is the resolved ProgressContext (None when the event type is not handled).
    `awarded_badges` lists the badge awards created by THIS processing call — empty for
    replayed events, unknown event types, or events that made no badge newly eligible. The
    event pipeline uses this to publish notification-only SSE freshness signals.
    `xp_delta` is the authoritative ledger delta this event wrote (None when unhandled) —
    the league projection consumes it to keep `xp_this_season` fresh without re-scanning
    the ledger.
    """

    context: ProgressContext | None
    awarded_badges: list[UserBadge] = field(default_factory=list)
    xp_delta: int | None = None


def _suspicious_answer_count(answers: list[dict[str, Any]]) -> int | None:
    count = 0
    total = 0
    for answer in answers:
        if isinstance(answer, Mapping):
            total += 1
            for key in ("time_spent_ms", "time_ms"):
                if isinstance(value := answer.get(key), int) and value >= 0:
                    if value < ANSWER_TIMING_MIN_MS_PER_QUESTION:
                        count += 1
                    break
    return count if total > 0 else None


class GamificationEventProcessor:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._ledger = LedgerRepository(session)
        self._resolver = ProgressContextResolver(session)
        self._badges = BadgeEvaluator(session)

    async def process(self, event: BaseEvent) -> EventProcessResult:
        """Append the authoritative XP entry, resolve the user's ProgressContext, then
        evaluate the minimal applicable badge definitions and issue any new credentials.
        Returns the resolved context + the awards created by this call so the event
        pipeline can feed projections and notification-only SSE freshness signals."""
        if isinstance(event, CourseCompletedEvent):
            content_duration = event.payload.get("content_duration_seconds")
            gate = run_integrity_gate(
                IntegritySignals(
                    content_duration_seconds=content_duration
                    if isinstance(content_duration, int)
                    else None,
                    time_spent_seconds=event.time_spent_seconds,
                )
            )
            # Completion XP is capped per course (slice 09 remediation): replaying a
            # completion for the same course awards at most `COURSE_COMPLETION_XP` total.
            # The pattern mirrors the assessment mastery cap — same-course replays never
            # farm XP, while a first completion and different courses stay fully eligible.
            entries = await self._ledger.list_for_user(event.user_id)
            previous_completion = sum(
                e.xp_delta
                for e in entries
                if e.source_id == event.course_id and e.xp_type == "completion"
            )
            xp_delta = max(0, COURSE_COMPLETION_XP - previous_completion)

            context = await self._append_and_resolve(
                event=event,
                xp_type="completion",
                xp_delta=xp_delta,
                reason_code="COURSE_COMPLETE",
                integrity_status="flagged" if gate.flagged else "verified",
                org_id=event.org_id,
                source_type="course",
                source_id=event.course_id,
                event_timestamp=event.occurred_at,
            )
        elif isinstance(event, AssessmentSubmittedEvent):
            gate = run_integrity_gate(
                IntegritySignals(
                    question_count=len(event.question_level_answers),
                    suspicious_answer_count=_suspicious_answer_count(event.question_level_answers),
                )
            )
            multiplier = SIDE_ASSESSMENT_MULTIPLIER if event.assessment_kind == "side" else 1.0
            raw_xp = round(ASSESSMENT_MAX_MASTERY_XP * event.score_pct / 100 * multiplier)

            entries = await self._ledger.list_for_user(event.user_id)
            previous_mastery = sum(
                e.xp_delta
                for e in entries
                if e.source_id == event.assessment_id and e.xp_type == "mastery"
            )

            xp_delta = max(0, raw_xp - previous_mastery)

            context = await self._append_and_resolve(
                event=event,
                xp_type="mastery",
                xp_delta=xp_delta,
                reason_code=(
                    "SIDE_ASSESSMENT_MULTIPLIER"
                    if event.assessment_kind == "side"
                    else "MAIN_ASSESSMENT"
                ),
                multiplier_applied=multiplier,
                integrity_status="flagged" if gate.flagged else "verified",
                org_id=event.org_id,
                source_type="assessment",
                source_id=event.assessment_id,
                event_timestamp=event.occurred_at,
            )
        elif isinstance(event, JudgeSubmissionGradedEvent):
            if event.verdict != "accepted":
                return EventProcessResult(context=None)

            # F-15: judge XP flows through the SAME integrity gate as every other XP source —
            # never a hardcoded "verified". The gate treats absent signals as trusted (its
            # documented design, gate.py: "a caller that has nothing to say about a given
            # dimension leaves it None and that check is skipped"), so a judge event with no
            # wireable signal yet still enters the pipeline at the authoritative extension
            # point; when judge-specific signals (e.g. solve velocity across attempts or
            # device/fingerprint reuse) are wired in, they take effect here automatically.
            gate = run_integrity_gate(IntegritySignals())

            entries = await self._ledger.list_for_user(event.user_id)
            previous_mastery = sum(
                e.xp_delta
                for e in entries
                if e.source_id == event.problem_id and e.xp_type == "mastery"
            )

            xp_delta = max(0, JUDGE_PROBLEM_MASTERY_XP - previous_mastery)

            context = await self._append_and_resolve(
                event=event,
                xp_type="mastery",
                xp_delta=xp_delta,
                reason_code="JUDGE_PROBLEM_SOLVED",
                integrity_status="flagged" if gate.flagged else "verified",
                org_id=event.org_id,
                source_type="judge_problem",
                source_id=event.problem_id,
                event_timestamp=event.occurred_at,
            )
        else:
            return EventProcessResult(context=None)

        if context is None:
            return EventProcessResult(context=None)

        awarded = await self._badges.evaluate_and_award(event=event, context=context)
        return EventProcessResult(
            context=context,
            awarded_badges=awarded,
            xp_delta=locals().get("xp_delta"),
        )

    async def _append_and_resolve(
        self,
        *,
        event: BaseEvent,
        xp_type: str,
        xp_delta: int,
        reason_code: str,
        integrity_status: str,
        org_id: Any | None = None,
        source_type: str | None = None,
        source_id: Any | None = None,
        multiplier_applied: float = 1.0,
        event_timestamp: Any = None,
    ) -> ProgressContext:
        await self._ledger.verify_chain_for_user(event.user_id)
        await self._ledger.append(
            user_id=event.user_id,
            event_id=event.event_id,
            xp_type=xp_type,
            xp_delta=xp_delta,
            reason_code=reason_code,
            multiplier_applied=multiplier_applied,
            integrity_status=integrity_status,
            org_id=org_id,
            source_type=source_type,
            source_id=source_id,
            event_timestamp=event_timestamp,
        )
        return await self._resolver.resolve(event.user_id)
