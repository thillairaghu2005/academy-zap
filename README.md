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
| Add-on ✅ | Support tickets | `/support`, `/support/new`, `/support/[ticketId]`, `/admin/support(+/[ticketId])` |

F7 extras: draft editor with debounced autosave + `/courses/[id]?preview=1`
draft preview; in-review courses show a field-level diff vs the last
published version with a reviewer picker enforcing the two-person rule;
the append-only audit log links XP-affecting rows to their ledger entries
(expandable) with actor/event/date/ledger filters and a balance-reconciliation
panel; a guided admin walkthrough overlay auto-opens on first visit and can
be replayed from the sidebar.

Support add-on: learner ticket list + create form, private ticket threads
with a server-enforced status workflow (open → pending ↔ open, resolved /
closed, reopen-on-reply, 409s on invalid transitions), learner isolation
(404 for other accounts) and agent-only internal notes stripped from
learner reads; admin queue (shared DataTable) with filters, assignment,
workflow buttons, and internal-note replies — admin actions append to the
audit log and the admin dashboard counts open tickets.

## Auth & demo mode

Mock auth rules live server-side: `app/api/auth/session` issues a signed,
HttpOnly, 7-day session cookie (HMAC-SHA256, SameSite=Lax); `middleware.ts`
verifies it on every protected request and redirects anonymous visitors to
`/login?next=<path>` so they land back where they were headed. The client
`lib/api/auth.ts` is a thin fetch wrapper with the same signatures the old
all-client mock had — components never changed.

- Any email + password of 8+ characters signs in; `@admin.zapsters.dev`
  signs in the mock admin; `@error.zapsters.dev` demos the 401 path;
  `taken@zapsters.dev` demos the register 409.
- `SESSION_SECRET` — set in real deployments; falls back to a mock constant
  otherwise (flagged in the assumption register).
- `NEXT_PUBLIC_DEMO_MODE=true` (at build/dev time) — disables the route
  gate, auto-signs visitors in as the demo learner, and reveals the judge /
  cart / checkout demo-state affordances. Default (false) is the
  production-shaped journey: anonymous visitors must sign in first.

## Commands

```bash
pnpm dev       # Next.js dev server (Turbopack)
pnpm build     # production build
pnpm lint      # eslint
pnpm typecheck # tsc --noEmit
```
