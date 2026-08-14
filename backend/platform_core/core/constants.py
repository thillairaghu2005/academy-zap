"""Named constants with security or business meaning (fastapi-backend-sop.md §13)."""

from typing import Final

TOKEN_TYPE_ACCESS: Final = "access"
TOKEN_TYPE_REFRESH: Final = "refresh"

DENYLIST_KEY_PREFIX: Final = "denylist:"
REFRESH_COOKIE_NAME: Final = "zapsters_refresh"

# Idempotency-key TTL for the event-bus dedup table — long enough to outlast any plausible
# redelivery window, short enough not to grow the table unboundedly.
IDEMPOTENCY_KEY_RETENTION_DAYS: Final = 30
