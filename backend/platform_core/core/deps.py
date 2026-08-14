"""Shared `Depends()` — auth, DB session, RBAC guards (fastapi-backend-sop.md §1.3).

Any resource's route may depend on these freely: they belong to no single resource, so crossing
into them is not a subsystem-boundary violation.
"""

import uuid
from typing import Annotated, Any

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from platform_core.core.constants import TOKEN_TYPE_ACCESS
from platform_core.core.db.session import get_session
from platform_core.core.exceptions import NotAuthenticated, PermissionDenied, TokenInvalidError
from platform_core.core.models.user import User
from platform_core.core.rbac import Role
from platform_core.core.redis import AsyncRedis, get_redis
from platform_core.core.repositories.user import UserRepository
from platform_core.core.security import decode_token

_bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_session)]
RedisClient = Annotated[AsyncRedis, Depends(get_redis)]


async def get_current_user(
    session: DbSession,
    redis: RedisClient,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> User:
    if credentials is None:
        raise NotAuthenticated()

    payload = await decode_token(credentials.credentials, TOKEN_TYPE_ACCESS, redis)
    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except (AttributeError, TypeError, ValueError) as exc:
        raise TokenInvalidError() from exc

    user = await UserRepository(session).get_by_id(user_id)
    if user is None or not user.is_active:
        raise NotAuthenticated()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*allowed: Role) -> Any:
    async def _guard(user: CurrentUser) -> User:
        if Role(user.role) not in allowed:
            raise PermissionDenied()
        return user

    return Depends(_guard)


AdminUser = Annotated[User, require_role(Role.ORG_ADMIN, Role.PLATFORM_OPS)]
