"""The current badge catalog (slice 08).

The source docs (gamification §6/§7.3, platform §1) define the badge *mechanism* but do not
enumerate a catalog, so this is the smallest deterministic set mapped to already-existing
authoritative signals. Every row is also seeded by the (frozen) Alembic migration
`alembic/versions/gamification/da96596d5d81_badges_and_credentials.py`; the test suite
seeds its throwaway database from THIS module (the migration's copy is immutable history and
must not be edited once applied).

Trigger literals and threshold shapes are interpreted by
`gamification/projections/badges.py` — changing a threshold here is a product decision and
must be accompanied by updated eligibility tests.
"""

from typing import Any, Final

BADGE_DEFINITIONS: Final[list[dict[str, Any]]] = [
    {
        "badge_id": "first_course_completed",
        "name": "First Course Completed",
        "description": "Completed your first course on Zapsters.",
        "category": "learning",
        "trigger": "course_completed",
        "threshold": {},
    },
    {
        "badge_id": "perfect_assessment",
        "name": "Perfect Score",
        "description": "Scored 100% on an assessment.",
        "category": "mastery",
        "trigger": "assessment_submitted",
        "threshold": {"min_score_pct": 100},
    },
    {
        "badge_id": "streak_seven",
        "name": "7-Day Streak",
        "description": "Maintained a 7-day learning streak.",
        "category": "streak",
        "trigger": "streak_milestone",
        "threshold": {"min_streak_days": 7},
    },
    {
        "badge_id": "rank_spartan",
        "name": "Spartan",
        "description": "Reached the Spartan rank (level 3).",
        "category": "progression",
        "trigger": "rank_milestone",
        "threshold": {"min_level": 3},
    },
]
