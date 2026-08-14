"""JWT issuance/validation and password hashing (fastapi-backend-sop.md §7).

Per the OWASP JWT Cheat Sheet: the signature is the only thing that protects a token from
tampering, so `algorithms=` is always an explicit list, every token carries a `type` claim that
`decode_token` verifies against `expected_type`, and expiry vs. tampering are distinct exception
types.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash

from platform_core.core.config import settings
from platform_core.core.constants import (
    DENYLIST_KEY_PREFIX,
    TOKEN_TYPE_ACCESS,
    TOKEN_TYPE_REFRESH,
)
from platform_core.core.exceptions import TokenExpiredError, TokenInvalidError, TokenRevokedError
from platform_core.core.rbac import Role
from platform_core.core.redis import AsyncRedis

password_hasher = PasswordHash.recommended()  # argon2id


def hash_password(plain_password: str) -> str:
    return password_hasher.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hasher.verify(plain_password, hashed_password)


def _encode(
    *, subject: str, token_type: str, expires_delta: timedelta, extra_claims: dict[str, Any]
) -> tuple[str, str]:
    now = datetime.now(UTC)
    jti = str(uuid.uuid4())
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "jti": jti,
        "iat": now,
        "exp": now + expires_delta,
        **extra_claims,
    }
    token = jwt.encode(
        payload, settings.SECRET_KEY.get_secret_value(), algorithm=settings.JWT_ALGORITHM
    )
    return token, jti


def create_access_token(*, user_id: uuid.UUID, role: Role) -> tuple[str, str]:
    return _encode(
        subject=str(user_id),
        token_type=TOKEN_TYPE_ACCESS,
        expires_delta=timedelta(seconds=settings.JWT_ACCESS_TOKEN_EXPIRE_SECONDS),
        extra_claims={"role": role.value},
    )


def create_refresh_token(*, user_id: uuid.UUID) -> tuple[str, str]:
    return _encode(
        subject=str(user_id),
        token_type=TOKEN_TYPE_REFRESH,
        expires_delta=timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
        extra_claims={},
    )


def decode_token_unverified_denylist(token: str, expected_type: str) -> dict[str, Any]:
    """Decode + validate signature/expiry/type only — caller must separately check the denylist."""
    try:
        payload: dict[str, Any] = jwt.decode(
            token, settings.SECRET_KEY.get_secret_value(), algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenExpiredError() from exc
    except jwt.InvalidTokenError as exc:
        raise TokenInvalidError() from exc

    if payload.get("type") != expected_type:
        raise TokenInvalidError()
    return payload


async def decode_token(token: str, expected_type: str, redis: AsyncRedis) -> dict[str, Any]:
    payload = decode_token_unverified_denylist(token, expected_type)
    jti = payload.get("jti")
    if not jti:
        raise TokenInvalidError()

    # Fail closed: if Redis is unreachable, reject the token rather than trust it (SOP §7.2).
    try:
        is_denied = await redis.exists(f"{DENYLIST_KEY_PREFIX}{jti}")
    except Exception as exc:  # noqa: BLE001 - fail closed on any cache error, see above
        raise TokenRevokedError() from exc

    if is_denied:
        raise TokenRevokedError()
    return payload


async def revoke_token(token: str, redis: AsyncRedis) -> None:
    """Write `denylist:{jti}` with a TTL equal to the token's remaining lifetime."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False},
        )
    except jwt.InvalidTokenError as exc:
        raise TokenInvalidError() from exc

    jti = payload.get("jti")
    exp = payload.get("exp")
    if not jti or not exp:
        raise TokenInvalidError()

    ttl_seconds = max(int(exp - datetime.now(UTC).timestamp()), 1)
    await redis.set(f"{DENYLIST_KEY_PREFIX}{jti}", "1", ex=ttl_seconds)
