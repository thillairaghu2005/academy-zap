from fastapi import APIRouter

from assessments.routes import assessment, attempt
from platform_core.core.registry import register_subsystem

router = APIRouter()
router.include_router(assessment.router)
router.include_router(attempt.router)

register_subsystem("assessments", router)
