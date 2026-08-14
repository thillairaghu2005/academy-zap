from fastapi import APIRouter

from notifications.routes import notification
from platform_core.core.registry import register_subsystem

router = APIRouter()
router.include_router(notification.router)

register_subsystem("notifications", router)
