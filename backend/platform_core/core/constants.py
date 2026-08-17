"""Named constants with security or business meaning (fastapi-backend-sop.md §13)."""

from typing import Final

TOKEN_TYPE_ACCESS: Final = "access"
TOKEN_TYPE_REFRESH: Final = "refresh"

DENYLIST_KEY_PREFIX: Final = "denylist:"
REFRESH_COOKIE_NAME: Final = "zapsters_refresh"

# Leaderboard projection keys (gamification §2.4 — Redis sorted sets). One ZSET per scope;
# org-scoped boards (B2B cohorts) use a distinct key namespace (`leaderboard:org:{org_id}`),
# reserved but not built in this slice — see the slice 06 report.
LEADERBOARD_KEY_PREFIX: Final = "leaderboard:"

# Idempotency-key TTL for the event-bus dedup table — long enough to outlast any plausible
# redelivery window, short enough not to grow the table unboundedly.
IDEMPOTENCY_KEY_RETENTION_DAYS: Final = 30

# Real-time SSE (slice 07, gamification §2.3/§5.4 — notification transport only, never
# authoritative state). One Redis pub/sub channel per private user stream plus one shared
# broadcast channel for the public leaderboard read model. Tickets are short-lived single-use
# credentials so EventSource (which cannot set headers) never carries an access token.
SSE_TICKET_KEY_PREFIX: Final = "sse:ticket:"
SSE_TICKET_TTL_SECONDS: Final = 30
SSE_USER_CHANNEL_PREFIX: Final = "zapsters:sse:user:"
SSE_LEADERBOARD_CHANNEL: Final = "zapsters:sse:leaderboard:global"
SSE_HEARTBEAT_INTERVAL_SECONDS: Final = 25
