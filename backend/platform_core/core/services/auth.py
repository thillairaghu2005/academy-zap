"""Auth business logic (fastapi-backend-sop.md §1: business logic lives only in services/)."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from platform_core.core.constants import TOKEN_TYPE_REFRESH
from platform_core.core.exceptions import EmailAlreadyRegistered, InvalidCredentials
from platform_core.core.models.user import User
from platform_core.core.rbac import Role
from platform_core.core.redis import AsyncRedis
from platform_core.core.repositories.user import UserRepository
from platform_core.core.schemas.auth import RegisterInput, TokenPair
from platform_core.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    revoke_token,
    verify_password,
)


class AuthService:
    def __init__(self, session: AsyncSession, redis: AsyncRedis) -> None:
        self._session = session
        self._redis = redis
        self._users = UserRepository(session)

    async def register(self, data: RegisterInput) -> User:
        existing = await self._users.get_by_email(data.email)
        if existing is not None:
            raise EmailAlreadyRegistered()

        user = User(
            id=uuid.uuid4(),
            email=data.email,
            display_name=data.display_name,
            hashed_password=hash_password(data.password),
            role=Role.USER,
        )
        await self._users.create(user)
        await self._session.commit()
        return user

    async def authenticate(self, email: str, password: str) -> User:
        user = await self._users.get_by_email(email)
        if (
            user is None
            or not user.is_active
            or not verify_password(password, user.hashed_password)
        ):
            raise InvalidCredentials()
        return user

    def issue_tokens(self, user: User) -> tuple[TokenPair, str]:
        access, _ = create_access_token(user_id=user.id, role=Role(user.role))
        refresh, _ = create_refresh_token(user_id=user.id)
        return TokenPair(access_token=access), refresh

    async def refresh(self, refresh_token: str) -> tuple[TokenPair, str]:
        payload = await decode_token(refresh_token, TOKEN_TYPE_REFRESH, self._redis)
        user = await self._users.get_by_id(uuid.UUID(str(payload["sub"])))
        if user is None or not user.is_active:
            raise InvalidCredentials()

        # Rotate: the presented refresh token is revoked, a new pair is issued.
        await revoke_token(refresh_token, self._redis)
        return self.issue_tokens(user)

    async def logout(self, access_token: str, refresh_token: str | None) -> None:
        await revoke_token(access_token, self._redis)
        if refresh_token:
            await revoke_token(refresh_token, self._redis)
