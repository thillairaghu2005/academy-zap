"""Named rate limits (fastapi-backend-sop.md §9.1) — routes reference these, never inline values."""

from dataclasses import dataclass


@dataclass(frozen=True)
class RateLimit:
    times: int
    seconds: int


# Login, register, refresh, password reset — the credential-stuffing / brute-force targets.
AUTH_RATE_LIMIT = RateLimit(times=5, seconds=60)

# General authenticated traffic.
PUBLIC_RATE_LIMIT = RateLimit(times=60, seconds=60)

# The single most abusable route on the platform (platform §2.2) once B5 lands.
JUDGE_SUBMIT_RATE_LIMIT = RateLimit(times=10, seconds=60)
