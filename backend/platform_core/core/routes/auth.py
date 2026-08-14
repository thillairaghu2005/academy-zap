"""Auth routes — thin: parse via schema, call one service method, translate exceptions
(fastapi-backend-sop.md §11.3). Rate-limited per §9.2 (the credential-stuffing target).
"""

from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from platform_core.core.config import settings
from platform_core.core.constants import REFRESH_COOKIE_NAME
from platform_core.core.deps import CurrentUser, DbSession, RedisClient
from platform_core.core.exceptions import NotAuthenticated
from platform_core.core.rate_limiting import CompatibleRateLimiter
from platform_core.core.rate_limits import AUTH_RATE_LIMIT
from platform_core.core.schemas.auth import (
    LoginInput,
    RegisterInput,
    SessionState,
    TokenPair,
)
from platform_core.core.schemas.user import UserRead
from platform_core.core.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
_bearer_scheme = HTTPBearer(auto_error=False)
REFRESH_COOKIE_PATH = "/api/v1/auth"

_auth_rate_limit = CompatibleRateLimiter(
    times=AUTH_RATE_LIMIT.times,
    seconds=AUTH_RATE_LIMIT.seconds,
)


@router.post("/register", response_model=SessionState, dependencies=[Depends(_auth_rate_limit)])
async def register(
    data: RegisterInput, session: DbSession, redis: RedisClient, response: Response
) -> SessionState:
    service = AuthService(session, redis)
    user = await service.register(data)
    tokens, refresh_token = service.issue_tokens(user)
    _set_refresh_cookie(response, refresh_token)
    return SessionState(user=UserRead.model_validate(user), tokens=tokens)


@router.post("/login", response_model=SessionState, dependencies=[Depends(_auth_rate_limit)])
async def login(
    data: LoginInput, session: DbSession, redis: RedisClient, response: Response
) -> SessionState:
    service = AuthService(session, redis)
    user = await service.authenticate(data.email, data.password)
    tokens, refresh_token = service.issue_tokens(user)
    _set_refresh_cookie(response, refresh_token)
    return SessionState(user=UserRead.model_validate(user), tokens=tokens)


@router.post("/refresh", response_model=TokenPair, dependencies=[Depends(_auth_rate_limit)])
async def refresh(
    session: DbSession,
    redis: RedisClient,
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
) -> TokenPair:
    if refresh_token is None:
        raise NotAuthenticated()
    service = AuthService(session, redis)
    tokens, rotated_refresh_token = await service.refresh(refresh_token)
    _set_refresh_cookie(response, rotated_refresh_token)
    return tokens


@router.post("/logout", status_code=204)
async def logout(
    session: DbSession,
    redis: RedisClient,
    _current_user: CurrentUser,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
) -> None:
    service = AuthService(session, redis)
    await service.logout(credentials.credentials, refresh_token)
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        secure=settings.is_production,
        httponly=True,
        samesite="strict",
    )


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
        secure=settings.is_production,
        httponly=True,
        samesite="strict",
    )
