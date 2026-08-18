# Zapsters

Zapsters is a learning-platform frontend with courses, a code judge, virtual
labs, assessments, commerce, support, and gamification.

## Current Architecture

Authentication and course data run through a single boundary selected by
`NEXT_PUBLIC_AUTH_MODE` (see `.env.example`):

```text
Next.js UI
  -> SessionProvider / lib/data/demo services (AUTH_MODE switch)
  -> demo mode:  local demo stores (localStorage, lib/mocks fixtures)
  -> backend mode: same-origin /api/backend proxy -> FastAPI (real API)
  -> TanStack Query and React state
```

- **`NEXT_PUBLIC_AUTH_MODE=demo` (default):** frontend-only demo auth
  (localStorage) plus local demo course data, enrollment, and progress — no
  FastAPI needed.
- **`NEXT_PUBLIC_AUTH_MODE=backend`:** the same UI calls the real FastAPI
  APIs and the backend derives the user from the access token; the frontend
  never sends a `user_id`. Live today: auth (Argon2id + JWT access/refresh
  cookies + Redis denylist + RBAC/org scoping), the course catalog →
  enrollment → progress → completion vertical slice, the assessment vertical
  slice (MCQ attempts, server grading, telemetry), the gamification core
  (`/me/progress`, leaderboards, badges + `/verify/{credential_id}`, the
  seasonal `/me/league` surface), and the admin surface (audit log, credential
  review queue, season lifecycle).

The switch lives at the data boundary only — one UI, one set of components.
The session is local to the browser in demo mode. It is not a JWT, server
session, cookie, or security boundary.

`backend/` contains the FastAPI implementation: PostgreSQL 16 + TimescaleDB,
Redis 7, Alembic with per-subsystem migration namespaces, an outbox → Redis
Streams → worker → DLQ event bus with idempotency, and an append-only,
hash-chained XP ledger guarded by the Integrity Gate. Implemented vertical
slices: Platform Core auth/RBAC, Content (catalog/detail, enrollment, lesson
progress, `course.completed` events), Assessment (MCQ grading, telemetry,
`assessment.submitted` events), Gamification (Progress Context rank/streaks,
Redis leaderboard projections, Ed25519-signed credentials with a rate-limited
public verify URL, and Slice 09 seasonal leagues with idempotent
promotion/demotion finalization over the ledger), and Admin (append-only audit
log, the B3 credential review queue with immutable status history, season
lifecycle, leaderboard read models).

Remaining backend surfaces are honest, typed **501 stubs** — Judge execution,
Lab provisioning/terminal, short-answer and code grading, Commerce, Search,
Notifications, and admin analytics read models. `backend/FOUNDATION_STATUS.md`
is the live inventory of what is real vs. deferred.

The seeded demo account is:

```text
Email:    demo@zapsters.dev
Password: demo123
User:     Raghunandhan
```

## Data Layer

- `lib/mocks/` contains the realistic fixture data and mutable demo stores.
- `lib/data/demo/` exposes frontend-friendly async services for each feature.
- `lib/contracts/` contains shared TypeScript domain types.
- `components/providers/session-provider.tsx` is the single auth state source.

The demo services simulate loading, mutations, timers, grading, checkout, lab
progress, and error states without HTTP requests or a backend process. Commerce
and payment screens are explicitly frontend demonstrations and do not process
real payments.

Virtual Labs and Judge Engine behavior is simulated in the browser. No virtual
machines, containers, isolated networks, or code-execution servers are started.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, TanStack Query,
Zod, Framer Motion, Monaco, xterm.js, Video.js, and Vitest.

Backend: FastAPI (0.141.x line), Pydantic v2, SQLAlchemy 2.0 async, Alembic,
PostgreSQL 16 + TimescaleDB, Redis 7, Arq, PyJWT + `pwdlib[argon2]`, structlog,
import-linter, ruff/mypy/bandit/pip-audit. See `backend/README.md`.

## Commands

```text
pnpm install
pnpm dev       # development server
pnpm build     # production build
pnpm start     # production frontend
pnpm lint
pnpm typecheck
pnpm test
```

The frontend can still be deployed to Vercel as a standalone demo
(`NEXT_PUBLIC_AUTH_MODE=demo`). Production API development uses the commands
in `backend/README.md` and requires Docker, PostgreSQL, Redis, and a
configured environment.

## Backend Status

- **B0 Platform Core** — done: auth/RBAC/org scoping, subsystem registry +
  feature flags, rate limiting, audit log, per-subsystem Alembic.
- **B1 Event bus** — done: typed `BaseEvent` subclasses, Redis Streams
  producer/consumer/DLQ, idempotency table, raw-payload retention.
- **B2 Content** — catalog/detail, enrollment, progress, completion events
  done; signed-manifest playback, transcode pipeline, two-person publish, and
  moderation deferred.
- **B3 Ledger & Integrity** — done: hash-chained ledger, Integrity Gate,
  review queue (clear/reverse/escalate, immutable history); nightly
  re-verification job deferred.
- **B4 Progress Context & projections** — done: rank/streaks/leagues context,
  Redis leaderboards, Ed25519 credentials + verify URL, seasonal leagues;
  share cards, skill tree/quests/season-pass projections, and Arq schedulers
deferred.
- **B5 Judge / B6 Labs / B8 Commerce / B9 Search+Notifications** — typed 501
  stubs (tables exist).
- **B7 Assessment** — MCQ vertical slice live; short-answer and code grading
  deferred.

## Future Integration

The remaining `lib/data/demo/` modules are deferred-surface fixtures, not the
authentication or security boundary. Each deferred backend route returns an
explicit typed 501 rather than pretending to execute production behavior.

The design and domain references in `ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md`,
`ZAPSTERS_GAMIFICATION_ENGINE.md`, `E2-frontend-SOP.md`, and
`fastapi-backend-sop.md` are the production engineering source of truth.
