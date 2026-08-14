"""Platform Core WebSocket authentication for subsystem proxies."""

import uuid

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from platform_core.core.constants import TOKEN_TYPE_ACCESS
from platform_core.core.exceptions import AppError
from platform_core.core.models.user import User
from platform_core.core.redis import AsyncRedis
from platform_core.core.repositories.user import UserRepository
from platform_core.core.security import decode_token


async def authenticate_websocket(
    websocket: WebSocket, session: AsyncSession, redis: AsyncRedis
) -> User | None:
    authorization = websocket.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        await websocket.close(code=4401)
        return None

    try:
        payload = await decode_token(token, TOKEN_TYPE_ACCESS, redis)
        user_id = uuid.UUID(str(payload["sub"]))
    except (AppError, KeyError, TypeError, ValueError):
        await websocket.close(code=4401)
        return None

    user = await UserRepository(session).get_by_id(user_id)
    if user is None or not user.is_active:
        await websocket.close(code=4401)
        return None
    return user
