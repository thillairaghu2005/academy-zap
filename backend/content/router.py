from fastapi import APIRouter

from content.routes import course
from platform_core.core.registry import register_subsystem

router = APIRouter()
router.include_router(course.router)

register_subsystem("content", router)
