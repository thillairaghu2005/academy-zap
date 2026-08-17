from fastapi import APIRouter

from gamification.routes import events, leaderboard, progress, verify
from platform_core.core.registry import register_subsystem

router = APIRouter()
router.include_router(progress.router)
router.include_router(leaderboard.router)
router.include_router(verify.router)
router.include_router(events.router)

register_subsystem("gamification", router)
