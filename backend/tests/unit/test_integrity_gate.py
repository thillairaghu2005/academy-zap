"""Unit tier: the 5 named Integrity Gate heuristic checks (gamification §7.1), pure and
deterministic — no ML, no DB, no Redis.
"""

from gamification.integrity.gate import IntegritySignals, run_integrity_gate
from gamification.rules import (
    ANSWER_TIMING_MIN_MS_PER_QUESTION,
    RETRY_PATTERN_MAX_ATTEMPTS_NO_GAP,
    RETRY_PATTERN_MIN_GAP_SECONDS,
    SESSION_FINGERPRINT_MAX_DISTINCT_USERS,
    VELOCITY_MIN_COMPLETION_RATIO,
)


def test_no_signals_is_fully_trusted() -> None:
    result = run_integrity_gate(IntegritySignals())
    assert result.confidence_score == 1.0
    assert result.flagged is False


def test_plausible_completion_velocity_is_trusted() -> None:
    result = run_integrity_gate(
        IntegritySignals(content_duration_seconds=2400, time_spent_seconds=2000)
    )
    assert result.checks["velocity"] == 1.0
    assert result.flagged is False


def test_implausibly_fast_completion_is_flagged() -> None:
    duration = 2400
    implausible_time = int(duration * VELOCITY_MIN_COMPLETION_RATIO) - 1
    result = run_integrity_gate(
        IntegritySignals(content_duration_seconds=duration, time_spent_seconds=implausible_time)
    )
    assert result.checks["velocity"] == 0.0
    assert result.flagged is True


def test_implausibly_fast_answers_are_flagged() -> None:
    result = run_integrity_gate(
        IntegritySignals(
            question_count=10,
            total_answer_time_ms=(ANSWER_TIMING_MIN_MS_PER_QUESTION - 1) * 10,
        )
    )
    assert result.checks["answer_timing"] == 0.0


def test_session_fingerprint_farm_detection() -> None:
    result = run_integrity_gate(
        IntegritySignals(session_fingerprint_distinct_users=SESSION_FINGERPRINT_MAX_DISTINCT_USERS)
    )
    assert result.checks["session_fingerprint_reuse"] == 0.0


def test_session_fingerprint_below_threshold_is_trusted() -> None:
    result = run_integrity_gate(
        IntegritySignals(
            session_fingerprint_distinct_users=SESSION_FINGERPRINT_MAX_DISTINCT_USERS - 1
        )
    )
    assert result.checks["session_fingerprint_reuse"] == 1.0


def test_brute_force_retry_pattern_is_flagged() -> None:
    result = run_integrity_gate(
        IntegritySignals(
            retry_attempt_count=RETRY_PATTERN_MAX_ATTEMPTS_NO_GAP,
            retry_min_gap_seconds=RETRY_PATTERN_MIN_GAP_SECONDS - 1,
        )
    )
    assert result.checks["retry_pattern"] == 0.0


def test_genuine_study_and_retry_is_trusted() -> None:
    result = run_integrity_gate(
        IntegritySignals(
            retry_attempt_count=RETRY_PATTERN_MAX_ATTEMPTS_NO_GAP,
            retry_min_gap_seconds=RETRY_PATTERN_MIN_GAP_SECONDS + 1,
        )
    )
    assert result.checks["retry_pattern"] == 1.0


def test_device_sharing_flag() -> None:
    result = run_integrity_gate(IntegritySignals(device_unrelated_account_count=5))
    assert result.checks["device_sharing"] == 0.0


def test_multiple_suspicious_signals_lower_the_aggregate_confidence() -> None:
    result = run_integrity_gate(
        IntegritySignals(
            content_duration_seconds=2400,
            time_spent_seconds=1,
            session_fingerprint_distinct_users=SESSION_FINGERPRINT_MAX_DISTINCT_USERS,
        )
    )
    assert result.confidence_score == 0.0
    assert result.flagged is True
