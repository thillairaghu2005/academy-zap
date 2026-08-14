# Zapsters Backend

Platform Core + per-subsystem services (Content, Judge, Labs, Assessments, Gamification,
Commerce, Search, Notifications, Admin), per `../ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md`,
`../ZAPSTERS_GAMIFICATION_ENGINE.md`, and `../fastapi-backend-sop.md`.

This is the **foundation** layer: subsystem boundaries, DB schema + migrations, API/event
contracts, auth, the event bus, and the gamification ledger/integrity core are real. Most
non-core subsystem routes are typed, guarded, registered **stubs** (HTTP 501) for a subsequent
implementation pass — see each subsystem's `routes/` for
`NotImplementedFoundationError` call sites.

Note: the top-level package is `platform_core`, not `platform` — a package literally named
`platform` would shadow Python's stdlib `platform` module for the whole process (any dependency
that does `import platform` would resolve to ours instead of the stdlib's).

## Bootstrap

```bash
py -3.12 -m pip install --upgrade pip uv   # Windows: python 3.12 via the py launcher
uv venv --python 3.12
uv sync --extra dev
uv run pre-commit install
cp .env.example .env                       # fill in a real 32+ char SECRET_KEY
docker compose up -d
uv run alembic upgrade head
uv run uvicorn main:app --reload
```

`docker-compose.yml` maps Postgres to host port **5433** and Redis to **6380**, not the 5432/6379
defaults — this avoids clashing with another project's containers on the same machine. `.env` /
`.env.example` already point at those ports.

## Local check sequence

```bash
uv run ruff check --fix . && uv run ruff format .
uv run mypy .
uv run bandit -r platform_core content judge labs assessments gamification commerce admin search notifications -ll
uv run pip-audit
uv run lint-imports   # import-linter: gamification/judge scoring stays ML-import-free
uv run alembic upgrade head
uv run pytest tests/unit -v
uv run pytest tests/integration tests/security gamification/tests/acceptance -v
uv run pytest --cov --cov-report=term-missing --cov-fail-under=80
```

Tests need a running Postgres (`docker compose up -d`); they provision and drop their own
`zapsters_test` database each session and never touch the dev database.

`pip-audit` is clean for installed third-party packages. FastAPI is currently on the compatible
0.141.x line and Starlette is constrained to the patched 1.x line because the former 0.115.x
resolution resolves to vulnerable Starlette 0.46.x. The security baseline amendment is recorded in
both authoritative architecture documents. Redis-backed `fastapi-limiter` 0.1.x is retained with
the documented route-tree compatibility wrapper in `platform_core/core/rate_limiting.py`.
