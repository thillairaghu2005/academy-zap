from fastapi import APIRouter

from admin.routes import analytics, audit, leaderboards
from platform_core.core.registry import register_subsystem

router = APIRouter()
router.include_router(audit.router)
router.include_router(analytics.router)
router.include_router(leaderboards.router)

register_subsystem("admin", router)
