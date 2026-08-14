"""Unit tier: streak decay — the mandatory regression table from gamification §8.3."""

from gamification.context.streaks import apply_streak_decay


def test_one_day_gap_with_freeze_token_preserves_streak() -> None:
    result = apply_streak_decay(gap_days=1, has_freeze_token=True)
    assert result.preserved is True
    assert result.token_consumed is True


def test_one_day_gap_without_freeze_token_breaks_streak() -> None:
    result = apply_streak_decay(gap_days=1, has_freeze_token=False)
    assert result.preserved is False
    assert result.token_consumed is False


def test_no_gap_preserves_streak_without_consuming_a_token() -> None:
    result = apply_streak_decay(gap_days=0, has_freeze_token=True)
    assert result.preserved is True
    assert result.token_consumed is False


def test_multi_day_gap_breaks_streak_even_with_a_token() -> None:
    result = apply_streak_decay(gap_days=3, has_freeze_token=True)
    assert result.preserved is False
    assert result.token_consumed is False
