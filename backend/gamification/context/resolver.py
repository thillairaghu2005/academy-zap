"""The Progress Context Engine's resolver — orchestrates gamification §5.4 steps 1-4, 6, 7.

Step 5 (league/guild rollup) is explicitly out of scope this round: `league` and `guild` are
always `None` on the returned `ProgressContext`. All of `gamification/projections/*`
(leaderboard, badges, share cards, skill tree, quests, season pass, credentials) is likewise out
of scope — this resolver is the read path behind `GET /me/progress` only.
"""

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from gamification.context.rank import rank_progress_pct, resolve_rank
from gamification.context.schema import ProgressContext, RankState, StreakState
from gamification.context.streaks import momentum_multiplier
from gamification.models import LedgerEntry as LedgerEntryRow
from gamification.models import ProgressContextSnapshot
from gamification.repositories.context import ContextRepository
from gamification.repositories.ledger import LedgerRepository

# Foundation-scope simplification (assumption register): the §5.3 schema tracks xp_type as one
# of completion/mastery/bonus/adjustment but doesn't specify how bonus/adjustment feed the two
# rank tracks. Until reason-code-level routing exists, "bonus" is folded into completion_xp and
# "adjustment" is folded into whichever track its reason_code's prefix names, defaulting to
# completion_xp when ambiguous. Revisit once B4's full reason-code taxonomy lands.
_MASTERY_XP_TYPES = frozenset({"mastery"})


def _aggregate_xp(entries: list[LedgerEntryRow]) -> tuple[int, int]:
    mastery_xp = sum(e.xp_delta for e in entries if e.xp_type in _MASTERY_XP_TYPES)
    completion_xp = sum(e.xp_delta for e in entries if e.xp_type not in _MASTERY_XP_TYPES)
    return completion_xp, mastery_xp


def _resolve_streak(
    entries: list[LedgerEntryRow], *, user_id: uuid.UUID, today: date
) -> StreakState:
    active_dates = sorted({e.created_at.astimezone(UTC).date() for e in entries}, reverse=True)

    if not active_dates:
        return StreakState(
            user_id=user_id,
            current_streak_days=0,
            longest_streak_days=0,
            freeze_tokens_available=0,
            momentum_multiplier=1.0,
            last_active_date=today,
            status="broken",
        )

    last_active = active_dates[0]
    gap_from_today = (today - last_active).days

    current_streak = 0
    cursor = last_active
    for active_day in active_dates:
        if active_day == cursor:
            current_streak += 1
            cursor = cursor - timedelta(days=1)
        elif active_day < cursor:
            break

    longest_streak = current_streak
    run = 1
    for previous_day, this_day in zip(active_dates, active_dates[1:], strict=False):
        if (previous_day - this_day).days == 1:
            run += 1
        else:
            longest_streak = max(longest_streak, run)
            run = 1
    longest_streak = max(longest_streak, run)

    if gap_from_today == 0:
        status = "active"
    elif gap_from_today == 1:
        status = "grace_period"
    else:
        status = "broken"
        current_streak = 0

    return StreakState(
        user_id=user_id,
        current_streak_days=current_streak,
        longest_streak_days=longest_streak,
        freeze_tokens_available=0,  # not yet earnable — no side-assessment source built (B7)
        momentum_multiplier=momentum_multiplier(current_streak_days=current_streak),
        last_active_date=last_active,
        status=status,
    )


class ProgressContextResolver:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._ledger = LedgerRepository(session)
        self._context = ContextRepository(session)

    async def resolve(self, user_id: uuid.UUID) -> ProgressContext:
        # Step 1: ledger read (hash-chain verified in the write path / nightly job)
        entries = await self._ledger.list_for_user(user_id)

        # Step 2: XP aggregation per track.
        completion_xp, mastery_xp = _aggregate_xp(entries)

        # Step 3: rank resolution.
        level, rank_name = resolve_rank(completion_xp=completion_xp, mastery_xp=mastery_xp)
        progress_pct = rank_progress_pct(completion_xp=completion_xp, mastery_xp=mastery_xp)

        # Step 4: streak resolution.
        streak = _resolve_streak(entries, user_id=user_id, today=datetime.now(UTC).date())

        # Step 6: integrity flag check — any flagged entry freezes public visibility, not accrual.
        has_flagged = any(e.integrity_status == "flagged" for e in entries)
        freeze_status = "frozen_pending_review" if has_flagged else "live"
        unresolved_flags = ["integrity_review_pending"] if has_flagged else []

        rank_state = RankState(
            user_id=user_id,
            level=int(level),
            rank_name=rank_name,
            prestige_tier=0,  # prestige is a deliberate user opt-in, never automatic (§5.2)
            completion_xp=completion_xp,
            mastery_xp=mastery_xp,
            rank_progress_pct=progress_pct,
            percentile_global=0.0,  # nightly-computed projection, not built this round (B4)
            percentile_cohort=None,
            specialization_tag=None,  # category-XP-distribution projection, not built this round
        )

        # Step 7: freeze — context_version increments, old versions never overwritten.
        previous = await self._context.get_latest(user_id)
        next_version = (previous.context_version + 1) if previous else 1
        computed_at = datetime.now(UTC)

        context = ProgressContext(
            context_version=next_version,
            user_id=user_id,
            computed_at=computed_at,
            rank=rank_state,
            streak=streak,
            league=None,  # step 5 explicitly out of scope this round
            guild=None,
            unresolved_flags=unresolved_flags,
            freeze_status=freeze_status,
        )

        await self._context.save(
            ProgressContextSnapshot(
                id=uuid.uuid4(),
                user_id=user_id,
                context_version=next_version,
                computed_at=computed_at,
                rank=rank_state.model_dump(mode="json"),
                streak=streak.model_dump(mode="json"),
                league=None,
                guild=None,
                unresolved_flags=unresolved_flags,
                freeze_status=freeze_status,
            )
        )
        return context
