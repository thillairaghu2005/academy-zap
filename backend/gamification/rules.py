"""ALL named thresholds live here and nowhere else (build.md §7, gamification §5.4 step 3).

The XP bands are ILLUSTRATIVE in the source doc ("real thresholds live in rules.py", §5.2) —
these are mock/provisional constants, matching the frontend's own `RANK_LADDER` stance
(`lib/contracts/index.ts`'s assumption register). The weighted-rank formula and momentum curve
are likewise the frontend's own logged provisional weights, reproduced here so both sides start
from the same numbers.

Zero ML/AI imports in this module or in `context/rank.py`, `context/streaks.py`,
`context/resolver.py` — CI-enforced via the `tool.importlinter` contract in `pyproject.toml`
(gamification §7.5).
"""

from typing import Final, NamedTuple


class RankBand(NamedTuple):
    level: int
    name: str
    min_xp: int


# §5.2 — illustrative XP bands, Initiate -> Deus. Provisional; real thresholds tune against
# actual course-length/assessment-difficulty distributions once there's usage data.
RANK_LADDER: Final[tuple[RankBand, ...]] = (
    RankBand(1, "Initiate", 0),
    RankBand(2, "Oracle", 500),
    RankBand(3, "Spartan", 1_200),
    RankBand(4, "Titan", 2_500),
    RankBand(5, "Atlas", 4_500),
    RankBand(6, "Hyperion", 7_500),
    RankBand(7, "Olympian", 12_000),
    RankBand(8, "Primordial", 18_000),
    RankBand(9, "Ascendant", 26_000),
    RankBand(10, "Deus", 36_000),
)

# Displayed rank = weighted(mastery_xp, completion_xp) — never one blended input number computed
# any other way. Weights are the frontend's own provisional numbers (index.ts), pending
# rules.py's real product-decided weights.
MASTERY_XP_WEIGHT: Final = 0.6
COMPLETION_XP_WEIGHT: Final = 0.4

# Phase 0 award values. These are deterministic product constants and must be changed only with
# acceptance-fixture updates, not inferred by a model or supplied by the browser.
COURSE_COMPLETION_XP: Final = 400
ASSESSMENT_MAX_MASTERY_XP: Final = 500
SIDE_ASSESSMENT_MULTIPLIER: Final = 1.5
JUDGE_PROBLEM_MASTERY_XP: Final = 250

# Streak momentum multiplier: +0.05 per consecutive active day, capped at 2.0x.
MOMENTUM_INCREMENT_PER_DAY: Final = 0.05
MOMENTUM_CAP: Final = 2.0

# A gap of exactly one day is bridgeable by a freeze token; any larger gap breaks the streak
# regardless of freeze-token availability (gamification §8.3 mandatory regression cases).
STREAK_FREEZE_BRIDGEABLE_GAP_DAYS: Final = 1

# --- Integrity Gate thresholds (§7.1) -----------------------------------------------------------

# A course/lesson completed in under this fraction of its stated duration is a hard velocity flag.
VELOCITY_MIN_COMPLETION_RATIO: Final = 0.1

# Answers faster than this, on average, are treated as implausible reading+deciding time.
ANSWER_TIMING_MIN_MS_PER_QUESTION: Final = 1_500

# Distinct user_ids sharing one session_fingerprint within the lookback window before it's a
# farm-detection flag.
SESSION_FINGERPRINT_MAX_DISTINCT_USERS: Final = 3
SESSION_FINGERPRINT_LOOKBACK_HOURS: Final = 24

# Attempts in a monotonic-score-climb retry pattern, with no time gap, before it's a
# brute-force-guessing flag rather than genuine study-and-retry.
RETRY_PATTERN_MAX_ATTEMPTS_NO_GAP: Final = 5
RETRY_PATTERN_MIN_GAP_SECONDS: Final = 60

# Devices shared across accounts with no other relationship (guild/org) before it's a graph flag.
DEVICE_SHARING_MAX_UNRELATED_ACCOUNTS: Final = 2

# Below this aggregate confidence_score, an event is flagged (still ledgered, public-frozen).
INTEGRITY_CONFIDENCE_FLAG_THRESHOLD: Final = 0.5
