"""Unit tier — badge eligibility rules (slice 08, Phase 3).

Pure-function tests for the deterministic threshold evaluation: which trigger a given
authoritative event/state can satisfy, and whether the threshold passes. The full
event-driven award path (idempotency, credential issuance, API) is covered at the
integration tier; this file pins the *rules* exactly as `rules.py`-style named logic.
"""

import uuid
from datetime import UTC, date, datetime

import pytest

from gamification.context.schema import ProgressContext, RankState, StreakState
from gamification.models import BadgeDefinition
from gamification.projections.badges import BadgeEvaluator
from platform_core.events.schema import (
    AssessmentSubmittedEvent,
    CourseCompletedEvent,
    LoginRecordedEvent,
)


def _definition(trigger: str, threshold: dict[str, object]) -> BadgeDefinition:
    return BadgeDefinition(
        id=uuid.uuid4(),
        badge_id=f"badge-{trigger}",
        name="Test Badge",
        description="Test.",
        category="testing",
        trigger=trigger,
        threshold=threshold,
        enabled=True,
    )


def _course_event(*, user_id: uuid.UUID | None = None) -> CourseCompletedEvent:
    return CourseCompletedEvent(
        user_id=user_id or uuid.uuid4(),
        idempotency_key="course:1",
        session_fingerprint="fp",
        course_id=uuid.uuid4(),
        category="web_development",
        time_spent_seconds=600,
    )


def _assessment_event(*, score_pct: float) -> AssessmentSubmittedEvent:
    return AssessmentSubmittedEvent(
        user_id=uuid.uuid4(),
        idempotency_key="assessment:1",
        session_fingerprint="fp",
        assessment_id=uuid.uuid4(),
        assessment_kind="main",
        score_pct=score_pct,
        max_score=10.0,
        time_taken_seconds=60,
        attempt_number=1,
        question_level_answers=[],
    )


def _context(*, streak_days: int = 0, level: int = 1) -> ProgressContext:
    user_id = uuid.uuid4()
    return ProgressContext(
        context_version=1,
        user_id=user_id,
        computed_at=datetime.now(UTC),
        rank=RankState(
            user_id=user_id,
            level=level,
            rank_name="Initiate",
            prestige_tier=0,
            completion_xp=0,
            mastery_xp=0,
            rank_progress_pct=0.0,
            percentile_global=0.0,
            percentile_cohort=None,
            specialization_tag=None,
        ),
        streak=StreakState(
            user_id=user_id,
            current_streak_days=streak_days,
            longest_streak_days=streak_days,
            freeze_tokens_available=0,
            momentum_multiplier=1.0,
            last_active_date=date(2026, 8, 17),
            status="active" if streak_days else "broken",
        ),
        league=None,
        guild=None,
        unresolved_flags=[],
        freeze_status="live",
    )


# -- trigger selection ---------------------------------------------------------------


def test_course_trigger_only_fires_on_course_completion() -> None:
    definition = _definition("course_completed", {})
    assert BadgeEvaluator._triggered(definition, _course_event()) is True
    assert BadgeEvaluator._triggered(definition, _assessment_event(score_pct=100)) is False
    assert BadgeEvaluator._triggered(definition, LoginRecordedEvent(
        user_id=uuid.uuid4(), idempotency_key="k", session_fingerprint="fp"
    )) is False


def test_assessment_trigger_only_fires_on_assessment_submission() -> None:
    definition = _definition("assessment_submitted", {})
    assert BadgeEvaluator._triggered(definition, _assessment_event(score_pct=90)) is True
    assert BadgeEvaluator._triggered(definition, _course_event()) is False


def test_state_milestones_recheck_after_xp_events() -> None:
    streak = _definition("streak_milestone", {"min_streak_days": 7})
    rank = _definition("rank_milestone", {"min_level": 3})
    for event in (_course_event(), _assessment_event(score_pct=50)):
        assert BadgeEvaluator._triggered(streak, event) is True
        assert BadgeEvaluator._triggered(rank, event) is True
    login = LoginRecordedEvent(user_id=uuid.uuid4(), idempotency_key="k", session_fingerprint="fp")
    assert BadgeEvaluator._triggered(streak, login) is False


def test_unknown_trigger_never_fires() -> None:
    definition = _definition("mystery_trigger", {})
    assert BadgeEvaluator._triggered(definition, _course_event()) is False
    assert BadgeEvaluator._triggered(definition, _assessment_event(score_pct=100)) is False


# -- threshold evaluation -------------------------------------------------------------


def test_course_badge_eligible_on_any_completion() -> None:
    definition = _definition("course_completed", {})
    assert BadgeEvaluator._eligible(definition, _course_event(), _context()) is True


def test_perfect_score_threshold() -> None:
    definition = _definition("assessment_submitted", {"min_score_pct": 100})
    assert (
        BadgeEvaluator._eligible(definition, _assessment_event(score_pct=100), _context()) is True
    )
    assert (
        BadgeEvaluator._eligible(definition, _assessment_event(score_pct=99.9), _context()) is False
    )
    assert BadgeEvaluator._eligible(definition, _assessment_event(score_pct=0), _context()) is False


def test_streak_threshold() -> None:
    definition = _definition("streak_milestone", {"min_streak_days": 7})
    assert BadgeEvaluator._eligible(definition, _course_event(), _context(streak_days=7)) is True
    assert BadgeEvaluator._eligible(definition, _course_event(), _context(streak_days=6)) is False
    assert BadgeEvaluator._eligible(definition, _course_event(), _context(streak_days=0)) is False


def test_rank_threshold() -> None:
    definition = _definition("rank_milestone", {"min_level": 3})
    assert BadgeEvaluator._eligible(definition, _course_event(), _context(level=3)) is True
    assert BadgeEvaluator._eligible(definition, _course_event(), _context(level=4)) is True
    assert BadgeEvaluator._eligible(definition, _course_event(), _context(level=2)) is False


def test_eligibility_never_trusts_client_state() -> None:
    """Eligibility reads ONLY the server-validated event and the server-resolved context —
    there is no path for a client-supplied XP/rank/completion flag to reach this logic."""
    definition = _definition("rank_milestone", {"min_level": 3})
    # A low-ranked context can never be made eligible by any event payload.
    assert (
        BadgeEvaluator._eligible(definition, _assessment_event(score_pct=100), _context(level=1))
        is False
    )


@pytest.mark.parametrize(
    ("score", "expected"),
    [(100.0, True), (99.99, False), (75.0, False), (0.0, False)],
)
def test_perfect_score_boundary(score: float, expected: bool) -> None:
    # The event schema itself caps score_pct at 100, so the boundary is exactly 100.0.
    definition = _definition("assessment_submitted", {"min_score_pct": 100})
    assert (
        BadgeEvaluator._eligible(definition, _assessment_event(score_pct=score), _context())
        is expected
    )
