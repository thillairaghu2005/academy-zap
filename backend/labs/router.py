from fastapi import APIRouter

from labs.routes import lab, notebook, session, terminal
from platform_core.core.registry import register_subsystem

router = APIRouter()
router.include_router(lab.router)
router.include_router(notebook.router)
router.include_router(session.router)
router.include_router(terminal.router)

register_subsystem("labs", router)
