"""RBAC roles (build.md B0). Multi-tenancy scoping (`org_id`) is threaded through the
repository layer per query, never assumed from a prior check earlier in the request
(fastapi-backend-sop.md §8.2).

Note: this diverges from the frontend's `SessionRole` (`lib/contracts/session.ts`:
`user | student | learner | admin`), which that file's own assumption register flags as
provisional pending reconciliation with the real Platform Core schema — that reconciliation is
explicit future integration work (build.md §10), not this round's job.
"""

from enum import StrEnum


class Role(StrEnum):
    USER = "user"
    INSTRUCTOR = "instructor"
    ORG_ADMIN = "org_admin"
    PLATFORM_OPS = "platform_ops"


# Roles with elevated review-queue / moderation / audit-log read access (gamification §7.4,
# platform §8.1).
ADMIN_ROLES = frozenset({Role.ORG_ADMIN, Role.PLATFORM_OPS})
