"""Streak resolution — freeze-token consumption, momentum multiplier, decay (gamification §5.4
step 4). Zero ML/AI imports (CI-enforced, §7.5).

Implements the mandatory regression table (gamification §8.3):
    apply_streak_decay(gap_days=1, has_freeze_token=True)  -> streak preserved, token consumed
    apply_streak_decay(gap_days=1, has_freeze_token=False) -> streak broken
"""

from dataclasses import dataclass

from gamification.rules import (
    MOMENTUM_CAP,
    MOMENTUM_INCREMENT_PER_DAY,
    STREAK_FREEZE_BRIDGEABLE_GAP_DAYS,
)


@dataclass(frozen=True)
class StreakDecayResult:
    preserved: bool
    token_consumed: bool


def apply_streak_decay(*, gap_days: int, has_freeze_token: bool) -> StreakDecayResult:
    if gap_days <= 0:
        return StreakDecayResult(preserved=True, token_consumed=False)

    if gap_days <= STREAK_FREEZE_BRIDGEABLE_GAP_DAYS and has_freeze_token:
        return StreakDecayResult(preserved=True, token_consumed=True)

    return StreakDecayResult(preserved=False, token_consumed=False)


def momentum_multiplier(*, current_streak_days: int) -> float:
    return min(1.0 + MOMENTUM_INCREMENT_PER_DAY * current_streak_days, MOMENTUM_CAP)
