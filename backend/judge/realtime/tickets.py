"""Judge SSE tickets (slice 10 remediation F-7).

Mirrors the gamification SSE ticket pattern (`gamification/realtime/sse.py`) without importing
across the subsystem boundary: EventSource cannot set an Authorization header, so the frontend
exchanges its access token for a short-lived, SINGLE-USE ticket bound to the submitting user.
The ticket appears in the SSE URL for at most `ttl_seconds`, is consumed atomically (GETDEL)
on first use, and is never the access token itself.

Authorization for a specific submission is enforced separately at issuance
(`POST /judge/submissions/{id}/ticket`, which verifies ownership + tenant) AND again at stream
open (the stream route re-verifies the submission against the ticket's user).
"""

import secrets
from typing import Final

from platform_core.core.redis import AsyncRedis

JUDGE_SSE_TICKET_KEY_PREFIX: Final = "judge:sse:ticket:"


class JudgeSseTicketService:
    def __init__(self, *, ttl_seconds: int = 30) -> None:
        self.ttl_seconds = ttl_seconds

    async def issue(self, redis: AsyncRedis, *, user_id: str) -> str:
        ticket = secrets.token_urlsafe(32)
        await redis.set(
            f"{JUDGE_SSE_TICKET_KEY_PREFIX}{ticket}",
            user_id,
            ex=self.ttl_seconds,
        )
        return ticket

    async def consume(self, redis: AsyncRedis, ticket: str) -> str | None:
        """Single-use: GETDEL removes the key atomically — a replayed ticket is rejected."""
        user_id = await redis.getdel(f"{JUDGE_SSE_TICKET_KEY_PREFIX}{ticket}")
        return user_id if isinstance(user_id, str) else None


judge_sse_tickets = JudgeSseTicketService()
