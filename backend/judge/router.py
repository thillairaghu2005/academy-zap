from fastapi import APIRouter

from judge.routes import problem, submission
from platform_core.core.registry import register_subsystem

router = APIRouter()
router.include_router(problem.router)
router.include_router(submission.router)

register_subsystem("judge", router)
