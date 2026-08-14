"""Origin validation for cookie-authenticated state-changing endpoints."""

from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from platform_core.core.config import settings
from platform_core.core.constants import REFRESH_COOKIE_NAME

_COOKIE_AUTH_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
_COOKIE_AUTH_PATHS = frozenset({"/api/v1/auth/refresh", "/api/v1/auth/logout"})


class CookieOriginMiddleware(BaseHTTPMiddleware):
    """Reject cross-origin refresh/logout requests carrying the refresh cookie."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if (
            request.method in _COOKIE_AUTH_METHODS
            and request.url.path in _COOKIE_AUTH_PATHS
            and REFRESH_COOKIE_NAME in request.cookies
            and request.headers.get("origin") not in settings.CORS_ORIGINS
        ):
            return JSONResponse(status_code=403, content={"detail": "Origin is not allowed."})
        return await call_next(request)
