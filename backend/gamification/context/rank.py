"""Rank resolution — dual-track (Completion XP, Mastery XP), never blended into one input
number before this point (gamification §5.2). Zero ML/AI imports (CI-enforced, §7.5).

Implements the mandatory regression table (gamification §8.3):
    resolve_rank(completion_xp=0, mastery_xp=0)         -> (Level.INITIATE, "Initiate")
    resolve_rank(completion_xp=36000, mastery_xp=36000) -> (Level.DEUS, "Deus")
"""

from enum import IntEnum

from gamification.rules import COMPLETION_XP_WEIGHT, MASTERY_XP_WEIGHT, RANK_LADDER


class Level(IntEnum):
    INITIATE = 1
    ORACLE = 2
    SPARTAN = 3
    TITAN = 4
    ATLAS = 5
    HYPERION = 6
    OLYMPIAN = 7
    PRIMORDIAL = 8
    ASCENDANT = 9
    DEUS = 10


def weighted_rank_score(*, completion_xp: int, mastery_xp: int) -> float:
    """§5.2: "a weighted function of both, so a high-volume/low-mastery user and a
    low-volume/high-mastery user land at visibly different ranks even at similar totals."
    """
    return MASTERY_XP_WEIGHT * mastery_xp + COMPLETION_XP_WEIGHT * completion_xp


def resolve_rank(*, completion_xp: int, mastery_xp: int) -> tuple[Level, str]:
    score = weighted_rank_score(completion_xp=completion_xp, mastery_xp=mastery_xp)

    resolved = RANK_LADDER[0]
    for band in RANK_LADDER:
        if score >= band.min_xp:
            resolved = band
        else:
            break

    return Level(resolved.level), resolved.name


def rank_progress_pct(*, completion_xp: int, mastery_xp: int) -> float:
    """0-100 progress through the current band toward the next one. 100.0 at the top band."""
    score = weighted_rank_score(completion_xp=completion_xp, mastery_xp=mastery_xp)

    current_index = 0
    for index, band in enumerate(RANK_LADDER):
        if score >= band.min_xp:
            current_index = index

    current_band = RANK_LADDER[current_index]
    if current_index == len(RANK_LADDER) - 1:
        return 100.0

    next_band = RANK_LADDER[current_index + 1]
    band_width = next_band.min_xp - current_band.min_xp
    if band_width <= 0:
        return 100.0

    progress = (score - current_band.min_xp) / band_width * 100
    return max(0.0, min(100.0, progress))
