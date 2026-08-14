"""Global application settings — one Settings object, imported everywhere as `settings`.

Per fastapi-backend-sop.md §5: secrets are SecretStr, configuration validates itself at
import time, and CORS never combines a wildcard origin with allow_credentials=True.
"""

from functools import lru_cache

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # App
    ENV: str = "development"
    SECRET_KEY: SecretStr

    # Database / cache
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_SECONDS: int = 900  # 15 minutes
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS — explicit allow-list, never a wildcard combined with credentials
    CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    # Object storage (MinIO/S3) — content pipeline, not yet wired to any consumer this round
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: SecretStr = SecretStr("zapsters")
    S3_SECRET_KEY: SecretStr = SecretStr("zapsters-secret")
    S3_BUCKET: str = "zapsters-dev"

    # Search
    MEILISEARCH_URL: str = "http://localhost:7700"
    MEILISEARCH_API_KEY: SecretStr = SecretStr("zapsters-dev-master-key")

    @field_validator("JWT_ACCESS_TOKEN_EXPIRE_SECONDS")
    @classmethod
    def _cap_access_ttl(cls, v: int) -> int:
        if v > 900:
            raise ValueError("access token TTL must not exceed 900 seconds")
        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def _min_secret_length(cls, v: SecretStr) -> SecretStr:
        if len(v.get_secret_value()) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
