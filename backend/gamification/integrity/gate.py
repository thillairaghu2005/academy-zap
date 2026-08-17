"""The Integrity Gate — runs before an event becomes a ledger entry (gamification §7.1).

Heuristic + statistical, not a black-box ML classifier in v1 (§7.1: "start deterministic, only
add a learned model once there's labeled abuse data to train on"). Each check contributes a
0.0-1.0 confidence score for its own dimension; the aggregate `confidence_score` is their
average. Below `INTEGRITY_CONFIDENCE_FLAG_THRESHOLD` the event still writes to the ledger with
`integrity_status = flagged` (gate.py never deletes XP, never blocks the write) — the resolver
freezes public visibility for a flagged context (context/resolver.py step 6).
"""

from dataclasses import dataclass, field

from gamification.rules import (
    ANSWER_TIMING_MIN_MS_PER_QUESTION,
    DEVICE_SHARING_MAX_UNRELATED_ACCOUNTS,
    INTEGRITY_CONFIDENCE_FLAG_THRESHOLD,
    RETRY_PATTERN_MAX_ATTEMPTS_NO_GAP,
    RETRY_PATTERN_MIN_GAP_SECONDS,
    SESSION_FINGERPRINT_MAX_DISTINCT_USERS,
    VELOCITY_MIN_COMPLETION_RATIO,
)


@dataclass(frozen=True)
class IntegritySignals:
    """Raw inputs each check needs. All fields are optional — a caller (e.g. a login event) that
    has nothing to say about a given dimension leaves it `None` and that check is skipped
    (treated as fully trusted, i.e. contributes 1.0), rather than penalizing an event for a
    signal that was never applicable to it.
    """

    content_duration_seconds: int | None = None
    time_spent_seconds: int | None = None

    question_count: int | None = None
    suspicious_answer_count: int | None = None

    session_fingerprint_distinct_users: int | None = None  # UNIMPLEMENTED: wait for real signal

    retry_attempt_count: int | None = None  # UNIMPLEMENTED: wait for real signal
    retry_min_gap_seconds: int | None = None  # UNIMPLEMENTED: wait for real signal

    device_unrelated_account_count: int | None = None  # UNIMPLEMENTED: wait for real signal


@dataclass(frozen=True)
class GateResult:
    confidence_score: float
    checks: dict[str, float] = field(default_factory=dict)

    @property
    def flagged(self) -> bool:
        return self.confidence_score < INTEGRITY_CONFIDENCE_FLAG_THRESHOLD


def _velocity_check(signals: IntegritySignals) -> float | None:
    if signals.content_duration_seconds is None or signals.time_spent_seconds is None:
        return None
    if signals.content_duration_seconds <= 0:
        return 1.0
    ratio = signals.time_spent_seconds / signals.content_duration_seconds
    return 0.0 if ratio < VELOCITY_MIN_COMPLETION_RATIO else 1.0


def _answer_timing_check(signals: IntegritySignals) -> float | None:
    if signals.question_count is None or signals.suspicious_answer_count is None:
        return None
    if signals.question_count <= 0:
        return 1.0
    # Flag if >25% of questions are answered suspiciously fast
    ratio = signals.suspicious_answer_count / signals.question_count
    return 0.0 if ratio > 0.25 else 1.0


def _session_fingerprint_check(signals: IntegritySignals) -> float | None:
    if signals.session_fingerprint_distinct_users is None:
        return None
    return (
        0.0
        if signals.session_fingerprint_distinct_users >= SESSION_FINGERPRINT_MAX_DISTINCT_USERS
        else 1.0
    )


def _retry_pattern_check(signals: IntegritySignals) -> float | None:
    if signals.retry_attempt_count is None or signals.retry_min_gap_seconds is None:
        return None
    suspicious = (
        signals.retry_attempt_count >= RETRY_PATTERN_MAX_ATTEMPTS_NO_GAP
        and signals.retry_min_gap_seconds < RETRY_PATTERN_MIN_GAP_SECONDS
    )
    return 0.0 if suspicious else 1.0


def _device_sharing_check(signals: IntegritySignals) -> float | None:
    if signals.device_unrelated_account_count is None:
        return None
    return (
        0.0
        if signals.device_unrelated_account_count >= DEVICE_SHARING_MAX_UNRELATED_ACCOUNTS
        else 1.0
    )


_CHECKS = {
    "velocity": _velocity_check,
    "answer_timing": _answer_timing_check,
    "session_fingerprint_reuse": _session_fingerprint_check,
    "retry_pattern": _retry_pattern_check,
    "device_sharing": _device_sharing_check,
}


def run_integrity_gate(signals: IntegritySignals) -> GateResult:
    scores: dict[str, float] = {}
    for name, check in _CHECKS.items():
        result = check(signals)
        if result is not None:
            scores[name] = result

    confidence = sum(scores.values()) / len(scores) if scores else 1.0
    return GateResult(confidence_score=confidence, checks=scores)
