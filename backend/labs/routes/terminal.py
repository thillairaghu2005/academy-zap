"""ttyd bridge — 501-equivalent for WebSocket (there is no HTTP-style 501 for a WS handshake):
accept, send one error frame naming what's missing, close with code 4501.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, WebSocket
from sqlalchemy import select

from labs.models import LabSession
from platform_core.core.deps import DbSession, RedisClient
from platform_core.core.services.websocket_auth import authenticate_websocket

router = APIRouter(prefix="/labs", tags=["labs"])

NOT_IMPLEMENTED_WS_CODE = 4501


@router.websocket("/sessions/{session_id}/terminal")
async def terminal(
    websocket: WebSocket,
    session_id: uuid.UUID,
    session: DbSession,
    redis: RedisClient,
) -> None:
    user = await authenticate_websocket(websocket, session, redis)
    if user is None:
        return

    lab_session = (
        await session.execute(
            select(LabSession).where(
                LabSession.session_id == session_id,
                LabSession.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if (
        lab_session is None
        or lab_session.status != "running"
        or lab_session.expires_at <= datetime.now(UTC)
    ):
        await websocket.close(code=4403)
        return

    await websocket.accept()
    await websocket.send_json(
        {
            "error": "not_implemented",
            "subsystem": "labs",
            "see": "ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §6",
        }
    )
    await websocket.close(code=NOT_IMPLEMENTED_WS_CODE)
