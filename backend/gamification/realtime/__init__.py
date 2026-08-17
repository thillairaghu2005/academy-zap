"""Slice 07 real-time notification transport (gamification §2.3, §5.4).

SSE is a *notification/update transport only* — it never carries authoritative state. The
authoritative architecture remains: XP Ledger -> ProgressContext -> Leaderboard Projection
-> read APIs. The frontend treats every SSE event as "something changed" and re-reads the
authoritative APIs (query invalidation), never as data to render or mutate locally.

Channels:
- `zapsters:sse:user:{user_id}`   — private personal progression notifications. Only that
  user's authenticated stream receives them.
- `zapsters:sse:leaderboard:global` — public broadcast: "the board changed". Contains no
  private data (no XP, no integrity flags, no org metadata) — the frontend refetches the
  public board API.
"""

from gamification.realtime.sse import SseConnectionManager, sse_manager

__all__ = ["SseConnectionManager", "sse_manager"]
