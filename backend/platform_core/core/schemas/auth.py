"""Auth request/response contracts.

`LoginInput`/`RegisterInput` mirror `lib/contracts/session.ts` field-for-field. Request schemas
never accept server-assigned fields (`id`, `role`, `created_at`) — mass assignment is closed by
construction (fastapi-backend-sop.md §8.4).
"""

from pydantic import BaseModel, EmailStr, Field

from platform_core.core.schemas.user import UserRead


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegisterInput(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)


class TokenPair(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SessionState(BaseModel):
    user: UserRead
    tokens: TokenPair
