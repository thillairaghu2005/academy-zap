# Zapsters

The Zapsters learning platform: Udemy-shaped courses, a HackerRank-shaped code judge,
TryHackMe-shaped virtual labs, assessments, commerce, and a full gamification layer.

**Current state:** the frontend (F0–F7) is complete against a mock data layer; F8 cross-cutting
work is in progress. **Backend implementation has started** — see Part II of `build.md`.

Source-of-truth docs in this repo:

- `build.md` — the build plan. Part I (§0–§4) frontend F0→F8 and mock-layer discipline;
Part II (§5–§14) backend B0→B9, stack, gates, and the integration swap.
- `ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md` — Content / Judge / Lab / Assessment / Payments
contracts (`Protocol` interfaces §4.1, event schemas §4.3), subsystem data ownership (§4.2),
execution flows (§5, §6), integrity controls (§7).
- `ZAPSTERS_GAMIFICATION_ENGINE.md` — rank/XP/streak/league/guild/badge schemas
(`ProgressContext` etc. §5.3), the Integrity Gate (§7.1), ledger hash-chaining (§7.2),
verifiable credentials (§7.3).

---

## The architecture in one paragraph

**N independent subsystems behind one core.** Content, Judge, Lab, Assessment, Gamification,
Payments, Search, and Notifications each own a service boundary and their own tables. The core
never learns a subsystem's internals, and no subsystem reaches into another's database — the only
coupling is a versioned event on the bus. Activity events flow through the Integrity Gate, into a
hash-chained append-only XP ledger, through the Progress Context Engine, and out to projections
(leaderboards, badges, share cards) that are cache-like and rebuildable, never a source of truth.
That containment is why a sandbox escape in the Judge Engine is a Judge-subsystem incident rather
than a platform-wide one.

```
Browser/PWA → Next.js web app
                  ↓
        Platform Core (FastAPI) — auth · RBAC · registry · gateway
     ↓            ↓            ↓            ↓
  Content      Judge         Lab       Assessment
                  ↓ (all emit)
        Event bus (Redis Streams)
                  ↓
  Integrity Gate → xp_ledger (hash-chained) → ProgressContext
                  ↓
  Projections: leaderboards · badges · share cards · seasons
                  ↓
  Supporting: Search · Payments · Notifications · Admin/CMS · Certificates
```

---

## Stack

### Frontend (locked — no substitutions)

Next.js 16 App Router + Turbopack · TypeScript strict (`noUncheckedIndexedAccess`) ·
Tailwind v4 + shadcn/ui · TanStack Query 5 · react-hook-form + zod · Framer Motion ·
Fontsource Inter + Space Grotesk · Monaco (F2) · xterm.js (F3) · video.js (F1) ·
recharts/d3 (F5) · SSE for judge results and leaderboard ticks, WebSocket only for the lab
terminal.

### Backend (locked — no substitutions)

Python 3.12 · FastAPI 0.115 + Uvicorn/gunicorn · Pydantic 2.9 · SQLAlchemy 2.0 async + asyncpg ·
Alembic (per-subsystem migration namespaces) · PostgreSQL 16 + TimescaleDB · Redis 7 ·
Arq (task queue) · Redis Streams (event bus) · PyJWT + `pwdlib[argon2]` · fastapi-limiter ·
Meilisearch · Razorpay + Stripe (hosted checkout only) · Postal/SES · Web Push (VAPID) ·
Ed25519 via `pynacl` for credential signing · Pillow/Resvg or Playwright for share cards ·
structlog. Go 1.23 appears in exactly one place — the container-lifecycle hot path in the
Judge/Lab orchestrator — and that exception has its own ADR.

### Judge & Lab isolation

gVisor (`runsc`) for judge sandboxes · Firecracker microVMs via Kata Containers for labs ·
Kubernetes (k3s dev/staging → managed prod) with separate namespaces and node pools · cgroups v2
resource caps per submission · default-deny `NetworkPolicy` everywhere · ttyd and Apache Guacamole
behind the platform's own auth proxy · Falco for runtime monitoring · MOSS/JPlag for async
plagiarism scanning.

### Content pipeline

FFmpeg → Shaka Packager → MinIO/S3 → Cloudflare CDN, served as signed short-TTL per-session HLS
URLs with a burned-in user-ID watermark. No DRM in v1. MDX for lesson text.

### Infra

Docker + docker-compose for local dev and the core services · Kubernetes only where it is
genuinely needed (judge pods, lab microVMs) · Gitea + Gitea Actions · Traefik (K8s) and Nginx
Proxy Manager (core) · `uv` / `pnpm` · pre-commit (ruff, black, mypy, bandit, gitleaks) ·
Prometheus + Grafana + Loki · Sentry · MLflow.

---

## The rules that shape the code

These are load-bearing, not stylistic. Every section of `build.md` is an application of them.

1. **Contracts are not renegotiated at implementation time.** The frontend's `lib/contracts/` is a
hand-transcribed mirror of `platform/contracts/` and `gamification/context/schema.py`. If an
implementation wants a different shape, that is a schema-change PR against the source docs —
producer and consumer updated together, version bumped, never a quiet divergence.
2. **Events are the only cross-subsystem coupling.** Every event carries `event_id`,
`schema_version`, `idempotency_key`, and `session_fingerprint`. Redelivery is a no-op, never
double XP. No foreign key or query crosses a subsystem boundary.
3. **Only the ledger → resolver → projection path may mutate a score.** No route, no service, no
admin script writes XP or rank directly. The frontend was built to the same rule: it previews,
the server always wins.
4. **Deterministic scoring, never AI.** Verdicts, grades, XP, rank thresholds, streak decay, and
promotion cutoffs are named constants and testable Python — CI-enforced by an import-linter rule.
Claude writes narrative copy on top of computed numbers and nothing else.
5. **A sandbox or network config change is a security change** — reviewed from outside the squad
even when the diff looks like a bug fix.

---

## Typography

Typography is centralized in `src/styles/typography.css`, imported once by `app/globals.css`:

- Inter is the body and interface font.
- Space Grotesk is the display and heading font.
- The existing monospace stack remains reserved for code, terminals, IDs, and technical values.
- Semantic fluid utilities include `text-hero`, `text-h1`, `text-h2`, `text-h3`, `text-body`,
`text-small`, and `text-caption`.
- Fontsource provides local loading with `font-display: swap`; fonts are not loaded through
Google Fonts or `next/font`.

---

## Contract-first discipline

- `platform/contracts/` — the `Protocol` interfaces and shared Pydantic models, the single source
of truth every subsystem imports.
- `lib/contracts/` — hand-transcribed TypeScript mirrors of those schemas.
- `lib/api/` — one module per subsystem, async/network-shaped. Each function still has the same
signature it had in mock mode; the swap to real endpoints changes the body, not the caller.
- `lib/mocks/` — fixture data exercising every UI state. Retained during cutover so mock and real
can coexist behind a per-module flag.
- Server-owned numbers (XP, rank, verdicts) are never computed client-side.

---

## Frontend build order

| Section | Surface                    | Routes                                                                                                                           |
| ------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| F0 ✅    | Shell & design system       | `/`, `/login`, `/register` + all route stubs                                                                                     |
| F1 ✅    | Content Engine              | `/courses`, `/courses/[id]`, `/courses/[id]/learn`                                                                               |
| F2 ✅    | Judge Engine                | `/judge`, `/judge/[id]`                                                                                                          |
| F3 ✅    | Lab Engine                  | `/labs`, `/labs/[id]`, `/labs/[id]/session/[sessionId]`                                                                          |
| F4 ✅    | Assessment Engine           | `/assessments`, `/assessments/[id]`, `/assessments/[id]/attempt/[attemptId]`                                                     |
| F5 ✅    | Gamification UI             | `/rank`, `/rank/badges`, `/rank/verify/[credentialId]`, `/leaderboards`, `/guilds`                                               |
| F6 ✅    | Commerce UI                 | `/cart`, `/checkout/[checkoutId]`, `/checkout/billing`                                                                           |
| F7 ✅    | Admin/CMS                   | `/admin`, `/admin/courses(+/new/+/[id]/edit)`, `/admin/orders`, `/admin/users`, `/admin/labs`, `/admin/problems`, `/admin/audit` |
| F8 🚧    | Platform-level (cross-cutting) | Accessibility pass, PWA/offline caching, webhooks/public API                                                                    |

F0–F7 cover the original Udemy + HackerRank + TryHackMe surface area end to end. F8 and the
"recently added" list below track cross-cutting additions layered on top of that base — see
`build.md` Part I for the full per-surface checklist.

## Backend build order

| Section | Subsystem                    | Owns |
| ------- | ---------------------------- | ---- |
| B0 🚧    | Platform Core                | Auth, RBAC, multi-tenancy, subsystem registry, gateway, audit primitive, rate limiting |
| B1 ⬜    | Event bus & event contract   | `BaseEvent` + typed subclasses, Redis Streams, idempotency, replay, raw-payload storage |
| B2 ⬜    | Content Engine               | `courses`/`lessons`/`enrollments`, FFmpeg→Shaka video pipeline, signed manifests, two-person publish |
| B3 ⬜    | Ledger & Integrity           | `xp_ledger` hypertable, hash chain, Integrity Gate, review queue |
| B4 ⬜    | Progress Context & projections | Rank/streak/league resolution, leaderboards, badges, credentials, share cards, seasons |
| B5 ⬜    | Judge Engine                 | Submission queue, gVisor pods, `grader.py`, plagiarism scan, SSE results |
| B6 ⬜    | Lab Engine                   | Session namespaces, Firecracker microVMs, ttyd/Guacamole bridge, server-side objective checks |
| B7 ⬜    | Assessment Engine            | Question bank, deterministic grading, code-question delegation to Judge, anti-cheat ingestion, certificates |
| B8 ⬜    | Commerce                     | Orders, entitlements, subscriptions, dual-provider hosted checkout, webhook verification |
| B9 ⬜    | Supporting subsystems        | Meilisearch indexing, notifications, admin read models, public API + outbound webhooks |

**Critical path:** B0 unblocks everyone. B2 and B3/B4 run in parallel. B5 and B6 are the true
bottleneck pods and do not start until B0–B1 are frozen — a security-critical subsystem built
against a moving contract is how a rushed sandbox config ships.

**Phase mapping:** Phase 0 = B0–B4 · Phase 1 = B5 (Python only) · Phase 2 = B6 (one lab category)
· Phase 3 = B7–B9 · Phase 4 = hardening and scale.

---

## Release-blocking bars

A release does not ship if any of these are not met:

| Area | Bar |
| --- | --- |
| Judge correctness | 100% grader agreement with the hand-verified acceptance fixture set |
| Judge security | 100% fuzz-suite pass — no sandbox escape, no resource-cap bypass |
| Lab isolation | Zero successful cross-session network reach |
| Ledger integrity | 100% hash-chain verification; a broken chain is a P0, not a metric to trend |
| Rank correctness | 100% acceptance fixture pass before any release touching `context/` |
| Payments | 100% reconciliation match against the provider dashboard; a discrepancy is a P0 |
| Credentials | Verify URL correct and available; `revoked` shows correctly after a simulated reversal |
| Content delivery | Every expired signed URL rejected; sub-2s p95 time-to-first-frame |
| Latency | Sub-50ms p95 search, sub-100ms p99 leaderboard read |

---

## Recently added to the roadmap

Scoped into `build.md` against the same contract-first discipline as everything above. These
postdate the v1.0 source docs, so each needs a backend design pass (Part II §11) before its
frontend counterpart is wired:

- **Content:** per-lesson discussion/Q&A threads, course reviews/ratings, instructor/mentor
analytics dashboard, course-level certificates (distinct from skill badges), in-player notes +
timestamped bookmarking
- **Judge:** editorial/solution reveal, peer solution browsing, timed contest mode; multi-language
support beyond Python flagged as deferred, not forgotten
- **Labs:** XP-costed hint system, team/collaborative sessions, post-lab writeup submission
- **Gamification:** mentorship/referral XP, guild quests, public shareable profile pages
- **Admin:** usage + revenue analytics dashboard
- **Platform-wide (F8):** accessibility pass on Monaco/xterm panes, PWA offline lesson caching,
webhooks + public API for third-party LMS integration

---

## Commands

### Frontend

```
pnpm dev       # Next.js dev server (Turbopack)
pnpm build     # production build
pnpm lint      # eslint
pnpm typecheck # tsc --noEmit
```

### Backend

```
docker compose up -d          # Postgres+TimescaleDB, Redis, MinIO, Meilisearch, Postal
uv sync                       # install pinned deps
uv run alembic upgrade head   # migrations (per-subsystem namespaces)
uv run uvicorn platform.main:app --reload
uv run arq platform.worker.WorkerSettings   # task queue worker
uv run pytest                 # unit + integration + acceptance
uv run pytest -m security     # integrity, chain-tamper, RBAC, credential verification
pre-commit run --all-files    # ruff, black, mypy, bandit, gitleaks
```
