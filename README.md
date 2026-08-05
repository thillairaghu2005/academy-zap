# Zapsters — Frontend

Frontend-first build of the Zapsters learning platform: Udemy-shaped courses,
a HackerRank-shaped code judge, TryHackMe-shaped virtual labs, and a full
gamification layer.

Source-of-truth docs in this repo:

- `build.md` — the build plan (F0 → F7), mock-layer discipline, locked stack.
- `ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md` — Content / Judge / Lab / Assessment /
  Payments contracts (`Protocol` interfaces §4.1, event schemas §4.3).
- `ZAPSTERS_GAMIFICATION_ENGINE.md` — rank/XP/streak/league/guild/badge
  schemas (`ProgressContext` etc. §5.3).

## Stack (locked — no substitutions)

Next.js 16 App Router + Turbopack · TypeScript strict (`noUncheckedIndexedAccess`) ·
Tailwind v4 + shadcn/ui · TanStack Query 5 · react-hook-form + zod · Framer Motion ·
Monaco (F2) · xterm.js (F3) · video.js (F1) · recharts/d3 (F5).

## Contract-first discipline

- `lib/contracts/` — hand-transcribed TypeScript mirrors of the docs&apos; schemas.
- `lib/api/` — one module per subsystem, async/network-shaped, swappable for the
  real backend with zero component changes.
- `lib/mocks/` — fixture data that exercises every UI state.
- Server-owned numbers (XP, rank, verdicts) are never computed client-side —
  even in mock mode they come from the mock API.

## Build order

| Section | Surface | Routes |
|---|---|---|
| F0 ✅ | Shell & design system | `/`, `/login`, `/register` + all route stubs |
| F1 ✅ | Content Engine | `/courses`, `/courses/[id]`, `/courses/[id]/learn` |
| F2 ✅ | Judge Engine | `/judge`, `/judge/[id]` |
| F3 ✅ | Lab Engine | `/labs`, `/labs/[id]`, `/labs/[id]/session/[sessionId]` |
| F4 ✅ | Assessment Engine | `/assessments`, `/assessments/[id]`, `/assessments/[id]/attempt/[attemptId]` |
| F5 ✅ | Gamification UI | `/rank`, `/rank/badges`, `/rank/verify/[credentialId]`, `/leaderboards`, `/guilds` |
| F6 ✅ | Commerce UI | `/cart`, `/checkout/[checkoutId]`, `/checkout/billing` |
| F7 ✅ | Admin/CMS | `/admin`, `/admin/courses(+/new/+/[id]/edit)`, `/admin/orders`, `/admin/users`, `/admin/labs`, `/admin/problems`, `/admin/audit` |

## Commands

```bash
pnpm dev       # Next.js dev server (Turbopack)
pnpm build     # production build
pnpm lint      # eslint
pnpm typecheck # tsc --noEmit
```
