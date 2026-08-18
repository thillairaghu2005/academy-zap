"""Global application settings — one Settings object, imported everywhere as `settings`.

Per fastapi-backend-sop.md §5: secrets are SecretStr, configuration validates itself at
import time, and CORS never combines a wildcard origin with allow_credentials=True.
"""

from functools import lru_cache

from pydantic import Field, SecretStr, field_validator, model_validator
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

    # Judge Engine
    JUDGE_SANDBOX_TYPE: str = "gvisor"
    # Digest-pinned language image for sandboxed execution (platform §2.4: "pinned Docker
    # images per language"). The digest below is `python:3.12-alpine` resolved at Slice 10
    # remediation time; re-resolve with a real pull when bumping the runtime — a floating tag
    # is never acceptable for the production sandbox.
    JUDGE_SANDBOX_IMAGE: str = (
        "python:3.12-alpine@sha256:d09d15e60962ca365d1cd544a48773bac9d33f2fb1b00f2aa0deec78ade7dc31"
    )
    # Kubernetes sandbox target (platform §2.4: k3s dev/staging, managed nodes for prod).
    JUDGE_SANDBOX_NAMESPACE: str = "judge-sandboxes"
    JUDGE_SANDBOX_RUNTIME_CLASS: str = "gvisor"
    # Per-submission resource caps (platform §2.4 / §6.3: cgroups v2 — CPU time, memory, PID
    # count, wall clock, disk I/O — applied per submission, never left to image defaults).
    JUDGE_SANDBOX_MAX_OUTPUT_BYTES: int = 65536  # stdout/stderr cap, enforced DURING capture
    JUDGE_SANDBOX_MAX_PROCESSES: int = 64  # docker --pids-limit / ulimit -u inside the pod
    # writable tmpfs size (Docker) / ephemeral-storage limit (K8s)
    JUDGE_SANDBOX_MAX_DISK_MB: int = 64
    JUDGE_SANDBOX_CPU_LIMIT: str = "1"  # pod resources.limits.cpu / docker --cpu-quota=100000
    JUDGE_SANDBOX_MEMORY_LIMIT_MB: int = 256  # pod resources.limits.memory / docker --memory
    # Wall-clock grace added on top of the per-case time limit (sandbox setup/teardown
    # overhead); the pod's activeDeadlineSeconds is time_limit + this grace.
    JUDGE_SANDBOX_WALL_GRACE_SECONDS: int = 5
    # Worker reliability (slice 10 remediation F-10): reclaim idle pending messages, retry cap
    # before a submission is failed and moved to the dead-letter stream.
    JUDGE_RECLAIM_IDLE_MS: int = 60_000
    JUDGE_MAX_RETRIES: int = 3
    JUDGE_WORKER_CONSUMER_NAME: str = "judge-worker"

    @field_validator("JUDGE_SANDBOX_TYPE")
    @classmethod
    def _validate_judge_sandbox(cls, v: str) -> str:
        if v not in ("gvisor", "docker"):
            raise ValueError("JUDGE_SANDBOX_TYPE must be 'gvisor' or 'docker'")
        return v

    @model_validator(mode="after")
    def _fail_closed_on_docker_in_production(self) -> "Settings":
        """Production may never select the DevelopmentOnlyDockerSandbox (platform §2.9 do-not-use
        list). Enforced at Settings construction so EVERY process — API and Arq worker alike —
        fails at startup instead of silently grading real submissions on plain Docker.
        """
        if self.ENV == "production" and self.JUDGE_SANDBOX_TYPE == "docker":
            raise ValueError(
                "CRITICAL: DevelopmentOnlyDockerSandbox cannot be used in production. "
                "Set JUDGE_SANDBOX_TYPE=gvisor (or remove the override)."
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

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




@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
