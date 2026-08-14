"""Admin analytics — 501 stub. Read models over events (DAU/WAU, completion funnel, checkout
conversion) don't exist yet (build.md B9) — per-request aggregation over the ledger would not
hold at scale, so this waits for the real nightly-rollup read models rather than faking one.
"""

from fastapi import APIRouter

from platform_core.core.deps import require_role
from platform_core.core.exceptions import NotImplementedFoundationError
from platform_core.core.rbac import ADMIN_ROLES

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/analytics/{report}", dependencies=[require_role(*ADMIN_ROLES)])
async def get_analytics(report: str) -> None:
    raise NotImplementedFoundationError("admin", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §8.1")
