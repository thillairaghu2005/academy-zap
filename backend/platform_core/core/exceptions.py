"""Application exception hierarchy.

A route catches the specific domain exception and translates it to an HTTPException
(fastapi-backend-sop.md §11.5) — never a bare `except Exception`. Handlers are registered once
in main.py via `register_exception_handlers`.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base for every domain exception in this codebase."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    detail: str = "An application error occurred."

    def __init__(self, detail: str | None = None) -> None:
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


# --- Auth (fastapi-backend-sop.md §7) --------------------------------------------------------


class InvalidCredentials(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    detail = "Incorrect email or password."


class TokenExpiredError(AppError):
    """Distinct from TokenInvalidError — collapsing the two hides tampering (SOP §7.1.3)."""

    status_code = status.HTTP_401_UNAUTHORIZED
    detail = "Token has expired."


class TokenInvalidError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    detail = "Token is invalid."


class TokenRevokedError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    detail = "Token has been revoked."


class EmailAlreadyRegistered(AppError):
    status_code = status.HTTP_409_CONFLICT
    detail = "An account with this email already exists."


# --- Authorization (fastapi-backend-sop.md §8) ------------------------------------------------


class NotAuthenticated(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    detail = "Authentication required."


class PermissionDenied(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    detail = "You do not have permission to perform this action."


class ResourceNotFound(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    detail = "The requested resource was not found."


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    detail = "The requested operation conflicts with the current resource state."


class UnprocessableEntity(AppError):
    """A request was well-formed but semantically invalid (HTTP 422).

    Distinct from schema validation (which FastAPI answers with its own 422): this is for
    domain rules a route/service checks after the request parses, e.g. progress that exceeds
    the lesson's duration.
    """

    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    detail = "The request could not be processed."


# --- Gamification integrity (gamification doc §7.2) --------------------------------------------


class ChainIntegrityError(AppError):
    """A broken hash-chain link. Halts computation and pages on-call — never a warning."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    detail = "Ledger hash-chain verification failed."


# --- Foundation-phase subsystem stubs -----------------------------------------------------------


class NotImplementedFoundationError(AppError):
    """Raised by a registered-but-not-yet-implemented route.

    The route, its contract, and its auth guard are real; the business logic behind it is
    deliberately deferred to a later build phase. See build.md §8 (B0-B9) for what owns it.
    """

    status_code = status.HTTP_501_NOT_IMPLEMENTED

    def __init__(self, subsystem: str, see: str) -> None:
        self.subsystem = subsystem
        self.see = see
        super().__init__(f"{subsystem} is not yet implemented in this build — see {see}.")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        body: dict[str, object] = {"detail": exc.detail}
        if isinstance(exc, NotImplementedFoundationError):
            body["subsystem"] = exc.subsystem
            body["see"] = exc.see
        return JSONResponse(status_code=exc.status_code, content=body)
