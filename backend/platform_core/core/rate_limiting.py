"""FastAPI-Limiter compatibility wrapper for current FastAPI route trees.

The Redis-backed 0.1.x limiter is required by the platform architecture. Its dependency scans
``app.routes`` and assumes every item is an HTTP route, but newer FastAPI versions also expose
nested router entries. This wrapper keeps the package's Redis/Lua algorithm and fixes only that
route lookup boundary.
"""

import redis.exceptions
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter as BaseRateLimiter
from starlette.requests import Request
from starlette.responses import Response


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
