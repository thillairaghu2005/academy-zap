"""Unit tier (SOP §12): pure JWT/password functions only — no DB, no HTTP, no Redis. The
denylist-dependent behavior (`decode_token`, `revoke_token`) is exercised in
`tests/integration/test_auth_flow.py`, where fakeredis is in scope per the integration tier.
"""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from platform_core.core.config import settings
from platform_core.core.constants import TOKEN_TYPE_ACCESS
from platform_core.core.exceptions import TokenExpiredError, TokenInvalidError
from platform_core.core.rbac import Role
from platform_core.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token_unverified_denylist,
    hash_password,
    verify_password,
)


def test_access_token_roundtrip() -> None:
    user_id = uuid.uuid4()
    token, jti = create_access_token(user_id=user_id, role=Role.USER)

    payload = decode_token_unverified_denylist(token, TOKEN_TYPE_ACCESS)

    assert payload["sub"] == str(user_id)
    assert payload["type"] == TOKEN_TYPE_ACCESS
    assert payload["jti"] == jti
    assert payload["role"] == Role.USER.value


def test_refresh_token_rejected_as_access_token() -> None:
    token, _ = create_refresh_token(user_id=uuid.uuid4())

    with pytest.raises(TokenInvalidError):
        decode_token_unverified_denylist(token, TOKEN_TYPE_ACCESS)


def test_tampered_token_rejected() -> None:
    token, _ = create_access_token(user_id=uuid.uuid4(), role=Role.USER)
    # Flip a character in the middle of the signature segment, not the last character — trailing
    # base64url characters can share the same underlying bits (padding), so a last-char flip
    # doesn't reliably change the decoded signature and makes this test flaky.
    mid = len(token) // 2
    flipped_char = "A" if token[mid] != "A" else "B"
    tampered = token[:mid] + flipped_char + token[mid + 1 :]

    with pytest.raises(TokenInvalidError):
        decode_token_unverified_denylist(tampered, TOKEN_TYPE_ACCESS)


def test_expired_token_rejected() -> None:
    now = datetime.now(UTC)
    payload = {
        "sub": str(uuid.uuid4()),
        "type": TOKEN_TYPE_ACCESS,
        "jti": str(uuid.uuid4()),
        "iat": now - timedelta(minutes=20),
        "exp": now - timedelta(minutes=5),
    }
    expired_token = jwt.encode(
        payload, settings.SECRET_KEY.get_secret_value(), algorithm=settings.JWT_ALGORITHM
    )

    with pytest.raises(TokenExpiredError):
        decode_token_unverified_denylist(expired_token, TOKEN_TYPE_ACCESS)


def test_algorithm_none_rejected() -> None:
    """OWASP JWT Cheat Sheet: `alg: none` must never be accepted (SOP §7.1)."""
    forged = jwt.encode(
        {"sub": str(uuid.uuid4()), "type": TOKEN_TYPE_ACCESS, "jti": str(uuid.uuid4())},
        key="",
        algorithm="none",
    )

    with pytest.raises(TokenInvalidError):
        decode_token_unverified_denylist(forged, TOKEN_TYPE_ACCESS)


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("correct horse battery staple")

    assert verify_password("correct horse battery staple", hashed)
    assert not verify_password("wrong password", hashed)
    assert hashed != "correct horse battery staple"
