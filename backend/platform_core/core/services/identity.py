"""Platform Core identity read service exposed through the published contract."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from platform_core.contracts.identity import IdentityProvider, PublicIdentity
from platform_core.core.repositories.user import UserRepository


class IdentityService(IdentityProvider):
    def __init__(self, session: AsyncSession) -> None:
        self._users = UserRepository(session)

    async def get_public_identity(self, user_id: uuid.UUID) -> PublicIdentity | None:
        user = await self._users.get_by_id(user_id)
        if user is None or not user.is_active:
            return None
        return PublicIdentity(id=user.id, display_name=user.display_name)
