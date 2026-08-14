from fastapi import APIRouter

from commerce.routes import cart
from platform_core.core.registry import register_subsystem

router = APIRouter()
router.include_router(cart.router)

register_subsystem("commerce", router)
