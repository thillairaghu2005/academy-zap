# Zapsters

Zapsters is a learning-platform frontend with courses, a code judge, virtual
labs, assessments, commerce, support, and gamification.

## Current Architecture

The frontend uses FastAPI for authentication through a same-origin Next.js
proxy. Deferred feature surfaces still remain explicitly separate demo data
until their production vertical slices exist:

```text
Next.js UI
  -> frontend demo authentication (localStorage)
  -> local demo data services
  -> lib/mocks fixtures and browser state
  -> TanStack Query and React state
```

`backend/` contains the FastAPI foundation with PostgreSQL, Redis,
Alembic, event contracts, authentication, and the Phase 0 gamification ledger
path. The frontend has not been switched to that API yet.

Authentication is provided by `src/lib/demoAuth.ts` and exposed globally by
`SessionProvider` and `useSession()`. The demo account is:

```text
Email:    demo@zapsters.dev
Password: Demo@12345
User:     Raghunandhan
```

The session is local to the browser. It is not a JWT, server session, cookie,
or security boundary.

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
