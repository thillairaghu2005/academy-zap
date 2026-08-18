"""FastAPI-Limiter compatibility wrapper for current FastAPI route trees.

The Redis-backed 0.1.x limiter is required by the platform architecture. Its dependency scans
``app.routes`` and assumes every item is an HTTP route, but newer FastAPI versions also expose
nested router entries. This wrapper keeps the package's Redis/Lua algorithm and fixes only that
route lookup boundary.

``AuthenticatedRateLimiter`` (slice 10 remediation F-14) keys the window on the authenticated
user's id (and tenant when present) instead of the client IP, so shared NATs cannot bypass the
limit and a multi-instance deployment shares one Redis-backed counter. The route passes the
resolved ``CurrentUser`` explicitly to ``check_user`` — the limiter never needs to read request
state, which keeps it out of the auth dependency's identity-map lifecycle.
"""

import redis.exceptions
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter as BaseRateLimiter
from starlette.requests import Request
from starlette.responses import Response

from platform_core.core.models.user import User


class CompatibleRateLimiter(BaseRateLimiter):
    async def __call__(self, request: Request, response: Response) -> None:
        if not FastAPILimiter.redis:
            raise RuntimeError("FastAPILimiter must be initialized during application startup")

        route_index = 0
        dep_index = 0
        for index, route in enumerate(request.app.routes):
            if getattr(route, "path", None) == request.scope["path"] and request.method in getattr(
                route, "methods", set()
            ):
                route_index = index
                for dependency_index, dependency in enumerate(getattr(route, "dependencies", [])):
                    if self is dependency.dependency:
                        dep_index = dependency_index
                        break
                break

        identifier = self.identifier or FastAPILimiter.identifier
        callback = self.callback or FastAPILimiter.http_callback
        rate_key = await identifier(request)
        key = f"{FastAPILimiter.prefix}:{rate_key}:{route_index}:{dep_index}"
        try:
            pexpire = await self._check(key)
        except redis.exceptions.NoScriptError:
            FastAPILimiter.lua_sha = await FastAPILimiter.redis.script_load(
                FastAPILimiter.lua_script
            )
            pexpire = await self._check(key)

        if pexpire != 0:
            await callback(request, response, pexpire)


class AuthenticatedRateLimiter(CompatibleRateLimiter):
    """Redis-backed per-user (and per-tenant) rate limit (F-14).

    Keys on ``user:{id}`` plus ``tenant:{org_id}`` when the caller belongs to an org, so a
    shared NAT cannot bypass the limit and one tenant cannot flood a shared resource across
    many of its users. The window is Redis-backed, so the limit holds across instances. Callers
    use ``await limiter.check_user(request, user)`` from a dependency that declares
    ``CurrentUser`` so the authenticated identity is always available (never an IP fallback for
    authenticated routes).
    """

    async def check_user(self, request: Request, response: Response, user: User) -> None:
        """Apply the limit for an already-authenticated user."""
        if not FastAPILimiter.redis:
            raise RuntimeError("FastAPILimiter must be initialized during application startup")

        key = f"{FastAPILimiter.prefix}:judge-authz:user:{user.id}"
        if user.org_id is not None:
            key += f":tenant:{user.org_id}"
        key += f":{await self._route_key(request)}"
        try:
            pexpire = await self._check(key)
        except redis.exceptions.NoScriptError:
            FastAPILimiter.lua_sha = await FastAPILimiter.redis.script_load(
                FastAPILimiter.lua_script
            )
            pexpire = await self._check(key)

        if pexpire != 0:
            callback = self.callback or FastAPILimiter.http_callback
            await callback(request, response, pexpire)

    async def _route_key(self, request: Request) -> str:
        for index, route in enumerate(request.app.routes):
            if getattr(route, "path", None) == request.scope["path"] and request.method in getattr(
                route, "methods", set()
            ):
                return f"{index}:{request.method}"
        return f"0:{request.method}"
