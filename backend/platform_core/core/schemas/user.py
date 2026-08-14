"""UserRead excludes sensitive fields by construction (fastapi-backend-sop.md §8.3) — there is
no `hashed_password` field to remember to strip.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from platform_core.core.rbac import Role


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    display_name: str
    role: Role
    org_id: uuid.UUID | None
    is_active: bool
    created_at: datetime
