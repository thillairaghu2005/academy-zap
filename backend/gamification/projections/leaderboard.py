"""Leaderboard projection — Redis sorted-set read model (gamification §2.4, §5.5).

The XP ledger (via `ProgressContext`) remains authoritative; this module is a rebuildable
projection, never a source of truth.

Semantics (slice 06 decisions, all deterministic):
- Score: `weighted_rank_score(completion_xp, mastery_xp)` — the exact value `resolve_rank`
  consumes, so leaderboard order always agrees with displayed rank levels. Stored unrounded:
  Redis ZSET scores are doubles, and rounding could push a boundary score into the wrong band.
- Tie-break: Redis ZSET members are the user UUID strings; for equal scores Redis orders
  members by the member string ascending — deterministic and stable (no random/db-insertion
  order, no client sorting).
- Rank numbering: 1-based `position = offset + i + 1` within the full sorted set (dense ranks,
  matching the locked frontend's "offset+1.." pagination label and the existing demo fixtures).
- Frozen users: excluded from the ZSET entirely (gamification §7.4 — public leaderboard
  visibility freezes pending review; private XP still accrues).
- Scope: only `global` is a real board this slice; org-scoped B2B boards (`org:{org_id}` key
  namespace) and guilds are reserved/deferred.

Read path: `ZREVRANGE` (O(log N) rank lookups) + a single `HMGET` for the page's meta hash —
no full-table scan, no per-entry DB joins, no per-request XP recomputation. Update path: called
after each accepted gamification event, so the projection tracks the authoritative ledger
without the frontend triggering it. Rebuild: `DEL` + full rewrite from authoritative contexts,
so the board is always reconstructible from the ledger.
"""

import json
from typing import Any, Literal

from gamification.context.schema import ProgressContext  # frozen §5.3 contract
from platform_core.core.constants import LEADERBOARD_KEY_PREFIX
from platform_core.core.redis import AsyncRedis

LeaderboardScope = Literal["global", "org", "guild"]

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100


def _zset_key(scope: LeaderboardScope) -> str:
    return f"{LEADERBOARD_KEY_PREFIX}{scope}"


def _meta_key(scope: LeaderboardScope) -> str:
    return f"{LEADERBOARD_KEY_PREFIX}{scope}:meta"


def leaderboard_score(*, completion_xp: int, mastery_xp: int) -> float:
    """The projection's ordering score — the same weighted value `resolve_rank` consumes. Stored
    as the raw float (Redis ZSET scores are doubles), never rounded: rounding could move a
    boundary score across a rank band and make the board disagree with the user's own rank."""
    from gamification.context.rank import weighted_rank_score

    return weighted_rank_score(completion_xp=completion_xp, mastery_xp=mastery_xp)


def _display_meta(context: ProgressContext, display_name: str) -> str:
    """Public display fields only — no email, no auth/internal ids. level/rank_name/prestige
    come straight from the authoritative context, so the board can never drift from the rank
    the user sees on their own rank page."""
    return json.dumps(
        {
            "display_name": display_name,
            "avatar_url": None,
            "level": context.rank.level,
            "rank_name": context.rank.rank_name,
            "prestige_tier": context.rank.prestige_tier,
        }
    )


class LeaderboardProjection:
    """Read/write path for one scope's sorted set. All writes are idempotent ZADD/ZREM and all
    reads are ZRANGE/HMGET — replaying an event never duplicates a score (ZADD with the same
    member+score is a no-op), and concurrent writers are safe (Redis per-key atomicity)."""

    def __init__(self, redis: AsyncRedis) -> None:
        self._redis = redis

    # -- write path ----------------------------------------------------------------

    async def update_user(self, context: ProgressContext, *, display_name: str) -> None:
        """Refresh one user's position from their authoritative context. Frozen users are
        removed from the public board; verified users are upserted. Idempotent."""
        zset = _zset_key("global")
        member = str(context.user_id)
        if context.freeze_status == "frozen_pending_review":
            await self._redis.zrem(zset, member)
            return
        score = leaderboard_score(
            completion_xp=context.rank.completion_xp,
            mastery_xp=context.rank.mastery_xp,
        )
        await self._redis.zadd(zset, {member: score})
        await self._redis.hset(_meta_key("global"), member, _display_meta(context, display_name))

    # -- read path ---------------------------------------------------------------

    async def page(
        self,
        *,
        offset: int,
        limit: int,
        viewer_user_id: str | None = None,
    ) -> dict[str, Any]:
        """Top-N slice (1-based dense ranks) + total + has_more. `is_me` is set only when the
        viewer is authenticated and present in the page."""
        zset = _zset_key("global")
        total = await self._redis.zcard(zset)
        if total == 0 or offset >= total:
            empty: dict[str, Any] = {
                "scope": "global",
                "offset": offset,
                "total": total,
                "entries": [],
                "has_more": False,
            }
            return empty

        raw = await self._redis.zrevrange(zset, offset, offset + limit - 1, withscores=True)
        meta = await self._redis.hmget(_meta_key("global"), [member for member, _score in raw])

        entries = []
        for position, ((member, score), meta_raw) in enumerate(zip(raw, meta, strict=False)):
            display = json.loads(meta_raw) if meta_raw else {}
            entries.append(
                {
                    "rank": offset + position + 1,
                    "user_id": member,
                    "display_name": display.get("display_name", "Learner"),
                    "avatar_url": display.get("avatar_url"),
                    "score": float(score),
                    "level": display.get("level", 1),
                    "rank_name": display.get("rank_name", "Initiate"),
                    "prestige_tier": display.get("prestige_tier", 0),
                    "is_me": viewer_user_id is not None and member == viewer_user_id,
                }
            )

        return {
            "scope": "global",
            "offset": offset,
            "total": total,
            "entries": entries,
            "has_more": offset + len(entries) < total,
        }

    async def my_position(self, user_id: str) -> dict[str, Any] | None:
        """The caller's own entry (ZREVRANK — O(log N)), or None when not ranked."""
        zset = _zset_key("global")
        member = str(user_id)
        rank = await self._redis.zrevrank(zset, member)
        if rank is None:
            return None
        score = await self._redis.zscore(zset, member)
        meta_raw = await self._redis.hget(_meta_key("global"), member)
        display = json.loads(meta_raw) if meta_raw else {}
        return {
            "rank": int(rank) + 1,
            "user_id": member,
            "display_name": display.get("display_name", "Learner"),
            "avatar_url": display.get("avatar_url"),
            "score": float(score) if score is not None else 0.0,
            "level": display.get("level", 1),
            "rank_name": display.get("rank_name", "Initiate"),
            "prestige_tier": display.get("prestige_tier", 0),
            "is_me": True,
        }

    # -- rebuild ----------------------------------------------------------------

    async def rebuild(self, contexts: list[ProgressContext], display_names: dict[str, str]) -> int:
        """Reconstruct the global board from authoritative contexts + public display names (the
        caller decides the source — the ledger/resolver and the user table, never Redis).
        Returns the number of members written. Idempotent: DEL + full rewrite leaves the board
        identical to incremental updates given the same inputs."""
        zset = _zset_key("global")
        await self._redis.delete(zset)
        await self._redis.delete(_meta_key("global"))
        if not contexts:
            return 0

        pipe = self._redis.pipeline()
        for context in contexts:
            if context.freeze_status == "frozen_pending_review":
                continue
            member = str(context.user_id)
            score = leaderboard_score(
                completion_xp=context.rank.completion_xp,
                mastery_xp=context.rank.mastery_xp,
            )
            pipe.zadd(zset, {member: score})
            pipe.hset(
                _meta_key("global"),
                member,
                _display_meta(context, display_names.get(member, "Learner")),
            )
        await pipe.execute()
        return await self._redis.zcard(zset)
