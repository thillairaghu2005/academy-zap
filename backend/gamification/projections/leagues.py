"""League leaderboard projection — Redis sorted-set read model per (season, tier) (slice 09).

The XP ledger (via `ProgressContext`) remains authoritative; this module is a rebuildable
projection, never a source of truth — same posture as `projections/leaderboard.py`.

Key namespace: `league:{season_id}:{tier_id}` — one ZSET per season tier so the league
board is time-boxed to the season (gamification §5.4 step 5: league standing pulls from
the current season's ledger slice only).

Semantics (slice 09 decisions, all deterministic):
- Score: `xp_this_season` — the server-derived time-boxed slice of the authoritative ledger.
- Tie-break: equal scores order by member string DESCENDING — the order `ZREVRANGE` returns
  (same read-path semantics as the global board, and the same rule `SeasonService` uses at
  finalization, so the board's visible order and the promotion outcome always agree).
- Rank numbering: 1-based dense ranks within the tier.
- Frozen users: excluded, matching the global board's §7.4 freeze rule.
"""

import json
from typing import Any

from platform_core.core.redis import AsyncRedis

LEAGUE_KEY_PREFIX = "league:"


def _zset_key(season_id: str, tier_id: str) -> str:
    return f"{LEAGUE_KEY_PREFIX}{season_id}:{tier_id}"


def _meta_key(season_id: str, tier_id: str) -> str:
    return f"{LEAGUE_KEY_PREFIX}{season_id}:{tier_id}:meta"


def _display_meta(display_name: str) -> str:
    return json.dumps({"display_name": display_name, "avatar_url": None})


class LeagueProjection:
    """Read/write path for one season tier's sorted set. Idempotent ZADD/ZREM, rebuildable
    from the authoritative membership/ledger state."""

    def __init__(self, redis: AsyncRedis) -> None:
        self._redis = redis

    async def update_member(
        self,
        *,
        season_id: str,
        tier_id: str,
        user_id: str,
        xp_this_season: int,
        display_name: str,
    ) -> None:
        zset = _zset_key(season_id, tier_id)
        await self._redis.zadd(zset, {user_id: float(xp_this_season)})
        await self._redis.hset(_meta_key(season_id, tier_id), user_id, _display_meta(display_name))

    async def remove_member(self, *, season_id: str, tier_id: str, user_id: str) -> None:
        await self._redis.zrem(_zset_key(season_id, tier_id), user_id)

    async def page(
        self,
        *,
        season_id: str,
        tier_id: str,
        offset: int,
        limit: int,
        viewer_user_id: str | None = None,
    ) -> dict[str, Any]:
        zset = _zset_key(season_id, tier_id)
        total = await self._redis.zcard(zset)
        if total == 0 or offset >= total:
            return {
                "season_id": season_id,
                "tier": tier_id,
                "offset": offset,
                "total": total,
                "entries": [],
                "has_more": False,
            }
        raw = await self._redis.zrevrange(zset, offset, offset + limit - 1, withscores=True)
        meta = await self._redis.hmget(_meta_key(season_id, tier_id), [m for m, _s in raw])
        entries = []
        for position, ((member, score), meta_raw) in enumerate(zip(raw, meta, strict=False)):
            display = json.loads(meta_raw) if meta_raw else {}
            entries.append(
                {
                    "rank": offset + position + 1,
                    "user_id": member,
                    "display_name": display.get("display_name", "Learner"),
                    "avatar_url": display.get("avatar_url"),
                    "xp_this_season": int(float(score)),
                    "is_me": viewer_user_id is not None and member == viewer_user_id,
                }
            )
        return {
            "season_id": season_id,
            "tier": tier_id,
            "offset": offset,
            "total": total,
            "entries": entries,
            "has_more": offset + len(entries) < total,
        }

    async def my_standing(
        self, *, season_id: str, tier_id: str, user_id: str
    ) -> dict[str, Any] | None:
        zset = _zset_key(season_id, tier_id)
        rank = await self._redis.zrevrank(zset, user_id)
        if rank is None:
            return None
        score = await self._redis.zscore(zset, user_id)
        meta_raw = await self._redis.hget(_meta_key(season_id, tier_id), user_id)
        display = json.loads(meta_raw) if meta_raw else {}
        return {
            "rank": int(rank) + 1,
            "user_id": user_id,
            "display_name": display.get("display_name", "Learner"),
            "avatar_url": display.get("avatar_url"),
            "xp_this_season": int(float(score)) if score is not None else 0,
            "is_me": True,
        }

    async def rebuild_from_memberships(
        self,
        *,
        season_id: str,
        tier_id: str,
        members: list[tuple[str, int, str]],
    ) -> int:
        """Full rewrite from authoritative membership state (season_id, tier_id, and a list of
        (user_id, xp_this_season, display_name) tuples). Idempotent: DEL + rewrite leaves the
        board identical to incremental updates given the same inputs."""
        zset = _zset_key(season_id, tier_id)
        await self._redis.delete(zset)
        await self._redis.delete(_meta_key(season_id, tier_id))
        if not members:
            return 0
        pipe = self._redis.pipeline()
        for user_id, xp, display_name in members:
            pipe.zadd(zset, {user_id: float(xp)})
            pipe.hset(_meta_key(season_id, tier_id), user_id, _display_meta(display_name))
        await pipe.execute()
        return await self._redis.zcard(zset)
