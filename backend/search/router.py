from fastapi import APIRouter

from platform_core.core.registry import register_subsystem
from search.routes import search

router = APIRouter()
router.include_router(search.router)

register_subsystem("search", router)
