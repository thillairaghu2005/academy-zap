"""Unit tier: rank resolution — the mandatory regression table from gamification §8.3."""

from gamification.context.rank import Level, resolve_rank


def test_resolve_rank_zero_xp_is_initiate() -> None:
    assert resolve_rank(completion_xp=0, mastery_xp=0) == (Level.INITIATE, "Initiate")


def test_resolve_rank_max_xp_is_deus() -> None:
    assert resolve_rank(completion_xp=36_000, mastery_xp=36_000) == (Level.DEUS, "Deus")


def test_resolve_rank_is_monotonic_in_xp() -> None:
    low_level, _ = resolve_rank(completion_xp=0, mastery_xp=0)
    high_level, _ = resolve_rank(completion_xp=5_000, mastery_xp=5_000)
    assert high_level >= low_level
