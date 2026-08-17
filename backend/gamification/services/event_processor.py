"""Server-authoritative domain-event to ledger processing.

The event processor is the only application path that turns platform activity into XP. Routes and
frontend state never provide an XP amount or mutate rank state directly.
"""

from collections.abc import Mapping
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from gamification.context.resolver import ProgressContextResolver
from gamification.context.schema import ProgressContext
from gamification.integrity.gate import IntegritySignals, run_integrity_gate
from gamification.repositories.ledger import LedgerRepository
from gamification.rules import (
    ASSESSMENT_MAX_MASTERY_XP,
    COURSE_COMPLETION_XP,
    SIDE_ASSESSMENT_MULTIPLIER,
)
from platform_core.events.schema import (
    AssessmentSubmittedEvent,
    BaseEvent,
    CourseCompletedEvent,
)


def _answer_time_ms(answers: list[dict[str, Any]]) -> int | None:
    values = [
        value
        for answer in answers
        if isinstance(answer, Mapping)
        for key in ("time_spent_ms", "time_ms")
        if isinstance(value := answer.get(key), int) and value >= 0
    ]
    return sum(values) if values else None


class GamificationEventProcessor:
    def __init__(self, session: AsyncSession) -> None:
        self._ledger = LedgerRepository(session)
        self._resolver = ProgressContextResolver(session)

    async def process(self, event: BaseEvent) -> ProgressContext | None:
        """Append the authoritative XP entry and resolve the user's ProgressContext. Returns
        the resolved context so the event pipeline can feed projections (slice 06)."""
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
            return await self._append_and_resolve(
                event=event,
                xp_type="completion",
                xp_delta=COURSE_COMPLETION_XP,
                reason_code="COURSE_COMPLETE",
                integrity_status="flagged" if gate.flagged else "verified",
                org_id=event.org_id,
                source_type="course",
                source_id=event.course_id,
            )
        if isinstance(event, AssessmentSubmittedEvent):
            gate = run_integrity_gate(
                IntegritySignals(
                    question_count=len(event.question_level_answers),
                    total_answer_time_ms=_answer_time_ms(event.question_level_answers),
                )
            )
            multiplier = SIDE_ASSESSMENT_MULTIPLIER if event.assessment_kind == "side" else 1.0
            xp_delta = round(ASSESSMENT_MAX_MASTERY_XP * event.score_pct / 100 * multiplier)
            return await self._append_and_resolve(
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
            )
        return None

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
    ) -> ProgressContext:
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
        )
        return await self._resolver.resolve(event.user_id)
