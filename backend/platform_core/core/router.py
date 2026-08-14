"""Aggregates every subsystem router under `/api/v1` — mounted once, by main.py (SOP §1.4)."""

from fastapi import APIRouter

from platform_core.core.registry import enabled_routers
from platform_core.core.routes import auth, health

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(health.router)


def build_api_router() -> APIRouter:
    """Called from main.py's lifespan, after every subsystem module has imported (and thereby
    self-registered via `register_subsystem`) — see main.py for the import order.
    """
    for router in enabled_routers():
        api_router.include_router(router)
    return api_router
