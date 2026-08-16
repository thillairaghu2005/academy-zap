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
  course APIs (`/api/v1/courses`, enroll, progress, my-learning) and the
  backend derives the user from the access token; the frontend never sends a
  `user_id`.

The switch lives at the data boundary only — one UI, one set of components.
The session is local to the browser in demo mode. It is not a JWT, server
session, cookie, or security boundary.

`backend/` contains the FastAPI foundation with PostgreSQL, Redis, Alembic,
event contracts, authentication, and the gamification ledger path. The course
catalog → enrollment → course-access vertical slice is implemented there with
organization/tenant isolation, publication-state enforcement, and idempotent
enrollment.

The seeded demo account is:

```text
Email:    demo@zapsters.dev
Password: zapsters-demo
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

The frontend can still be deployed to Vercel as a standalone demo. Production
API development uses the commands in `backend/README.md` and requires Docker,
PostgreSQL, Redis, and a configured environment.

## Future Integration

The remaining `lib/data/demo/` modules are deferred-surface fixtures, not the
authentication or security boundary. Each deferred backend route returns an
explicit typed 501 rather than pretending to execute production behavior.

The design and domain references in `ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md`,
`ZAPSTERS_GAMIFICATION_ENGINE.md`, `E2-frontend-SOP.md`, and
`fastapi-backend-sop.md` are the production engineering source of truth.
