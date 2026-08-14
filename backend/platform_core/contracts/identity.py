"""Published Platform Core identity read contract for subsystem consumers."""

import uuid
from typing import Protocol

from pydantic import BaseModel


class PublicIdentity(BaseModel):
    id: uuid.UUID
    display_name: str


class IdentityProvider(Protocol):
    async def get_public_identity(self, user_id: uuid.UUID) -> PublicIdentity | None: ...
