# Zapsters

Zapsters is a learning-platform frontend demo with courses, a simulated code
judge, virtual labs, assessments, commerce, support, and gamification.

## Current Architecture

Zapsters currently runs as a frontend-only application:

```text
Next.js UI
  -> frontend demo authentication (localStorage)
  -> local demo data services
  -> lib/mocks fixtures and browser state
  -> TanStack Query and React state
```

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

No backend, database, secret, API server, payment provider, Docker service, or
additional startup command is required. The project can be deployed to Vercel
as a frontend demo.

## Future Integration

A real backend can be integrated later by replacing or extending the modules in
`lib/data/demo/` while keeping the component contracts and `lib/contracts/`
types stable. The current mock data remains the source for the standalone demo.

The design and domain references in `ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md`,
`ZAPSTERS_GAMIFICATION_ENGINE.md`, and `build.md` document possible future
platform behavior. They are not runtime requirements for this repository.
