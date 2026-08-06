# Zapsters — BUILD.md

**Source docs:** `ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md` (v1.0) + `ZAPSTERS_GAMIFICATION_ENGINE.md` (v1.0)

**Status:** Frontend F0–F7 complete against the mock layer; F8 (cross-cutting) in progress.
**Backend build starts now** — Part II below is the plan for it.

This document has two halves:

- **Part I (§0–§4) — Frontend.** Every UI surface built against the **locked contract shapes**
already defined in both docs (the `Protocol` interfaces in platform §4.1, the
`ProgressContext`/`RankState`/etc. schemas in gamification §5.3) using a mock data layer, so
integration is a data-layer swap and not a UI rewrite.
- **Part II (§5–§14) — Backend.** The real implementations behind those exact signatures, in the
phase order the source docs already lock: Platform Core + Event Contract → Content + Ledger &
Integrity in parallel → Judge/Lab (highest security bar) → Commerce → hardening.

§4's integration checklist is no longer a future note — it is now live work, expanded per module
in §10.

---

# PART I — FRONTEND

---

## 0. The one rule that makes "integrate later" actually work

Both source docs already establish this discipline for the real backend — reuse it for the
mock:
> The frontend never invents its own shape for a course, a submission result, a rank, or a
> leaderboard row. It consumes the **exact Pydantic/TypeScript-mirrored contract** the backend
> doc already locked. A mock is just an object satisfying that contract with fixture data instead
> of a database.

Concretely:

- [ ] Create `lib/contracts/` — hand-transcribe every schema you'll touch (`Course`,
`SignedManifest`, `CodeSubmission`, `JudgeResult`, `LabSession`, `ObjectiveResult`,
`AssessmentSubmission`, `GradeResult`, `Cart`, `CheckoutSession`, `ProgressContext`,
`RankState`, `StreakState`, `LeagueStanding`, `GuildRollup`, `LedgerEntry`) as TypeScript
types/zod schemas, field-for-field matching the docs.
- [ ] Create `lib/api/` — one module per subsystem (`content.ts`, `judge.ts`, `labs.ts`,
`assessments.ts`, `payments.ts`, `gamification.ts`), each exporting functions with the **same
signatures** as the backend `Protocol` classes (`getCourse`, `submit`, `getResult`,
`provisionSession`, `checkObjective`, `createCheckout`, etc.)
- [ ] Every function in `lib/api/` is a thin wrapper: right now it returns fixture data (from
`lib/mocks/`) with an artificial delay; later it becomes a real `fetch`/TanStack Query call.
**The component layer never knows the difference.**
- [ ] Fixtures live in `lib/mocks/*.json` or `.ts`, one file per contract, realistic enough to
exercise every UI state (empty, loading, error, partial, full, edge-case like a `flagged` integrity status or a `revoked` credential).

This is the same "consume the contract, not the side-effect" law the gamification doc calls
load-bearing for its own backend (§0) — applying it to the mock layer now is what prevents a
second rewrite later.

---

## 1. Frontend tech stack (locked, from platform §2.7 + gamification §2.3)

| Layer                      | Choice                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework                  | Next.js 16.2.7+, App Router, Turbopack                                                                                                           |
| Language                   | TypeScript 5.x strict, `noUncheckedIndexedAccess` on                                                                                             |
| UI                         | Tailwind v4 + shadcn/ui — shared design tokens in `@theme` across every surface                                                                  |
| Code editor (Judge)        | Monaco Editor                                                                                                                                    |
| Terminal (Lab)             | xterm.js                                                                                                                                         |
| GUI access (Lab, optional) | Guacamole viewer component (behind a feature flag until Lab backend exists)                                                                      |
| Video player               | video.js                                                                                                                                         |
| Data fetching              | TanStack Query 5.x                                                                                                                               |
| Real-time                  | SSE for judge-result polling, combo/leaderboard ticks; WebSocket only for the lab terminal (the one place bidirectionality is actually required) |
| Forms                      | react-hook-form + zod                                                                                                                            |
| Animation                  | Framer Motion + `tailwindcss-animate` — rank-up transitions, confetti, combo meter                                                               |
| Charts                     | d3 (skill tree, custom force/tree layout) or recharts (XP history line)                                                                          |
| Share-card client preview  | `html-to-image` (client preview only — canonical file is server-rendered later; mock it as a static PNG for now)                                 |
| Payments UI                | Razorpay/Stripe **hosted checkout embeds** — never a custom card-number input, even as a mock                                                    |

No backend infra (Postgres, Redis, Kubernetes, gVisor, Kata, FastAPI, Arq) is needed for any of
this phase — that is all Part II's stack (§6), and the split is deliberate: nothing in the
component layer should ever have needed to know which of the two it was talking to.

---

## 2. Build order — UI surfaces, prioritized

Each surface below: build the page/component tree, wire it to `lib/api/`, mock every state
(loading/empty/error/success), and don't move on until it's visually and interactively complete
against the mock — that's what makes it a drop-in once real data exists.

### F0 — Shell & design system (do this first, everything else sits inside it)

- [x] Tailwind v4 `@theme` tokens + shadcn/ui install, shared across all subsystem UIs
- [x] App shell: top nav, side nav, auth screens (UI only — no real auth yet, use a mock
session context/provider)
- [x] Global layout primitives: page container, card, empty-state, error-state, skeleton loaders
— build these once, every subsystem below reuses them
- [x] Route structure scaffolded for all subsystems (`/courses`, `/judge`, `/labs`, `/assessments`,
`/rank`, `/leaderboards`, `/guilds`, `/checkout`, `/admin`) even if most are stubs initially
- [x] Global search shell: command-palette / search-as-you-type UI wired to a mock unified
search endpoint spanning courses + problems + labs (extend the F1 catalog's mock-Meilisearch
shape platform-wide rather than reinventing it per surface)
- [ ] Accessibility pass on shell primitives: keyboard nav + focus states for nav, modals, and
form primitives, so every subsystem inherits it rather than patching it in later
- [x] Notification center shell (bell icon + panel/tray) in the top nav — surface is empty/mock
for now, subsystems below plug events into it as they're built

### F1 — Content Engine UI (Udemy-shaped)

- [x] Catalog/browse page (search bar UI wired to a mock Meilisearch response shape)
- [x] Course detail page: syllabus, enrollment CTA, reviews placeholder
- [x] Course player: video.js with mock signed-manifest URLs, lesson sidebar, resume-position,
captions toggle, playback speed
- [x] Progress indicator per lesson/course (feeds mock `enrollments` state)
- [x] Mock the `draft` vs `published` distinction in the authoring preview flow (F7) even before
a CMS exists
- [ ] Discussion/Q&A threads per lesson: mock `lib/api/discussions.ts` (thread list, reply,
upvote), rendered in a collapsible panel alongside the lesson — this is the biggest retention
gap in the current surface
- [ ] Course reviews/ratings: turn the existing reviews placeholder on the course detail page
into a real mock-backed surface (`Review` contract: rating, text, author, helpful-count;
aggregate rating rollup on the course card)
- [ ] Instructor/mentor dashboard (`/instructor` or `/mentor`): enrollment counts, completion
funnel, per-lesson drop-off, mock student progress heatmap — separate route tree from `/admin`,
scoped to an instructor's own courses
- [ ] Course-level certificate of completion: distinct contract from the skill-based
credential/badge system in F5 — mock PDF/share-link generation on 100% course completion
- [ ] In-player notes + timestamped bookmarking: note list keyed to video timestamp, jump-to-time
on click, mock export (Markdown/PDF) of a course's full note set

### F2 — Judge Engine UI (HackerRank-shaped)

- [x] Problem list + problem detail (statement, constraints, starter code)
- [x] Monaco editor pane, language selector (start with Python only, per the backend's own
Phase-1 language slice — don't build a multi-language picker UI ahead of what's real)
- [x] Submit flow: optimistic "submitted" state → mock 202 + `submission_id` → poll (mock SSE or
interval) → render `JudgeResult` (verdict, runtime_ms, memory_kb, test_cases_passed/total)
- [x] Verdict states styled distinctly: `accepted`, `wrong_answer`, `time_limit_exceeded`,
`runtime_error`, `compile_error` — these are the exact literal values from the backend event
schema, use them verbatim so nothing needs remapping later
- [x] Result history per problem/user
- [ ] **Roadmap flag:** multi-language support beyond Python is intentionally deferred — do not
build a multi-language picker UI now, but track it explicitly here so it isn't silently
forgotten once Phase-1 Python ships and backend adds more judges
- [ ] Editorial/solution reveal: unlock after a passing submission or after N failed attempts
(mock the unlock-condition check in `lib/api/judge.ts`, not client-side)
- [ ] Peer solution browsing: sanitized top-solutions list sortable by runtime/memory, mock
fixture data with multiple submitters per problem
- [ ] Contest/timed-challenge mode: reuses the Judge submit/poll flow plus the F4 combo-meter
component; mock a contest leaderboard and countdown timer

### F3 — Lab Engine UI (TryHackMe-shaped)

- [x] Lab catalog + lab detail (objectives list, difficulty, estimated time)
- [x] "Start Lab" flow: mock session provisioning state → xterm.js terminal wired to a **mock
WebSocket** (echo server or scripted transcript) so the terminal UX is real even with no
backend
- [x] Session timer (countdown to hard timeout), objectives panel with live check-off
- [x] Guacamole GUI viewer stub for labs that declare a GUI requirement (build the container/UI
chrome now, real RDP/VNC stream comes with the backend)
- [x] Session-end / timeout UI states
- [ ] Lab hints system: per-objective hint reveal with an XP cost, tracked as its own line item —
never blended into Completion or Mastery XP, matching the gamification doc's "never one
blended number" rule (mock `lib/api/gamification.ts` for the deduction, not client math)
- [ ] Team/collaborative lab sessions: shared terminal view for a session with >1 participant —
scope as backend-phase-only; for now just stub the UI shell (participant list, shared cursor
indicator) behind a feature flag, don't build real multi-user WebSocket fanout yet
- [ ] Post-lab writeup/report submission: free-text/markdown report form on session end, mock
submission + a `pending_review`/`graded` status for CTF-style scoring

### F4 — Assessment Engine UI

- [x] Question flow (MCQ, short-answer, code-question which reuses the F2 Monaco component)
- [x] Timer, attempt tracking, submit confirmation
- [x] Live combo/multiplier meter (SSE-driven in prod; mock with a scripted interval for now) —
this is explicitly "the dopamine layer," worth getting the animation feel right early
- [x] Anti-cheat telemetry hooks stubbed (tab-visibility, paste-event listeners) — wire the event
capture now even though it just logs to console/mock until there's a real Integrity Gate to
send it to

### F5 — Gamification UI (this is most of the "showoff" surface area)

- [x] Rank ladder page: all 10 levels + Prestige tiers, current position highlighted, using the
exact rank names from gamification §5.2 (Initiate → Deus)
- [x] XP bars: Completion XP and Mastery XP shown as **two distinct tracks**, never blended —
match the backend's "never one blended number" rule visually, not just structurally
- [x] Streak widget: current streak, freeze tokens available, momentum multiplier, grace-period
state
- [x] Global + guild leaderboards (mock `ZRANGE`-shaped paginated data)
- [x] Guild boards: member list, combined XP, guild-vs-guild comparison
- [x] Season/league standing: tier badge (bronze→obsidian), promotion/relegation zone indicator
- [x] Skill tree visualization (d3 force/tree layout) over mock category-XP distribution
- [x] Badge wall + individual badge detail with a "Verify" link (mock verify page showing
`verified` / `flagged` / `revoked` states — build all three, not just the happy path)
- [x] Share-card modal: client preview via `html-to-image`, "Download/Share" button pointing at
a mock canonical PNG for now
- [x] Season Pass track UI (free + premium milestones), duels, daily quests — lower priority
within F5, sequence last if time-constrained
- [ ] Mentorship/referral XP: invite flow + peer-code-review flow, both feeding a distinct
mock XP source so it's traceable back to the `LedgerEntry` contract like every other XP grant
- [ ] Guild quests / guild-vs-guild challenges: goes beyond the static comparison view above —
mock a time-boxed quest contract (target, progress, reward) scoped to a guild
- [ ] Public profile page (`/u/[username]`): shareable, aggregates rank + badges + guild +
skill tree into one page, distinct from the share-card modal (that's a single-artifact export,
this is a persistent browsable page)
- [ ] Notification center content: rank-up, streak-at-risk, league promotion/relegation events
populate the F0 notification shell — mock event fixtures per type, each with its own icon/style

### F6 — Commerce UI

- [x] Cart + checkout page using Razorpay/Stripe **hosted checkout embeds** in sandbox/test mode
(real test-mode integration is fine to wire early since it's provider-hosted, not custom)
- [x] Subscription/B2B seat management screens (can stay mock-only until Commerce backend exists)
- [x] Entitlement gating UI: locked-content states for unpurchased courses/labs

### F7 — Admin/CMS UI (lowest priority — build last, or only stub it)

- [x] Course authoring: draft editor, preview link, "submit for review" → second-reviewer
publish flow (UI mirrors the two-person review rule even before it's enforced server-side)
- [x] Problem/lab authoring stubs
- [x] Moderation/audit-log view (mock append-only log rendering)
- [ ] Admin analytics dashboard: usage (DAU/WAU, completion rates) and revenue (checkout
conversion, MRR-shaped mock) views — F7 currently only covers authoring + audit log, no
aggregate reporting surface

### F8 — Platform-level features (cross-cutting, not owned by a single surface)

- [x] Search-as-you-type across courses + problems + labs: promote the F1 catalog's mock
Meilisearch shape into a shared `lib/api/search.ts` consumed by the F0 command-palette shell
- [ ] Accessibility pass across interactive surfaces: keyboard nav for the Monaco (F2) and
xterm.js (F3) panes specifically, since these are the two components least likely to get
keyboard support "for free" from shadcn/ui primitives; captions already covered in F1
- [ ] PWA / offline lesson caching: service worker + cache strategy for lesson video/text so
in-progress courses are viewable offline; scope to F1 content only, not Judge/Lab (those need
a live connection anyway)
- [ ] Webhooks/API for third-party LMS integration: outbound event webhooks (enrollment,
completion, credential-issued) plus a documented public API surface — relevant for
partner-community distribution (college clubs, chapter programs) the same way QUANTUM's
certification rollout needs verifiable, chapter-level completion data

---

## 3. What to explicitly NOT build yet

Keep the frontend honest about what's real vs. mocked — don't let convenience mocks quietly
become assumptions that don't hold once backend exists:

- No real auth/session persistence — a mock provider is fine, don't wire a real JWT flow until
Platform Core exists
- No real WebSocket to an actual terminal or microVM — script the xterm.js feed
- No real multi-user terminal fanout for F3 team lab sessions — stub the UI shell only, per F3
above
- No real payment capture — hosted checkout sandbox only, never a custom card field regardless
of mock/real status (this rule applies even in mock form, per the do-not-use list)
- No client-side XP/rank calculation logic — even in mock form, compute rank purely by calling
the mock `lib/api/gamification.ts`, never re-derive it in a component. This is the one habit
most worth enforcing early, since "the client previews, the server always wins" is a hard rule
in the real system — building the frontend as if the client is authoritative now creates real
rework later. This now explicitly includes hint-cost deductions and mentorship/referral XP —
new XP sources follow the same rule as the original ones.
- No LLM-graded anything in the UI's mocked responses (verdicts, scores) — keep mock data
deterministic and literal-matching the enums, so the later swap doesn't also require a UI logic
change
- No real outbound webhook delivery for F8 — mock the event payloads and a "would have sent"
log entry until Platform Core has a real event bus to publish onto

---

## 4. Integration checklist (now active — backend build has started)

Written while the frontend was mock-only so it would be designed for, not discovered. Per-module
cutover detail is in §10; this is the invariant list that must be true when the swap is finished:

- [ ] Swap each `lib/api/*.ts` function body from "return mock fixture" to "call the real
endpoint" — signatures shouldn't need to change if the contracts were transcribed correctly
in step 0
- [ ] Replace mock WebSocket/SSE sources with real ones (judge polling, lab terminal, combo
meter, leaderboard ticks, notification-center events)
- [ ] Replace the mock auth/session provider with real Platform Core auth
- [ ] Replace the `html-to-image` client-only share card with the real flow: server-rendered
canonical artifact wins, client preview stays as-is
- [ ] Verify every enum/literal used in the UI (`verdict`, `integrity_status`, `league_tier`,
credential `status`, review `status`, quest `status`) still matches the backend schema exactly
— these were hand-transcribed in step 0, so diff them against the source docs once real
Pydantic models exist
- [ ] Re-run the F2–F5 state matrix (loading/empty/error/success/edge-case) against real data —
a mock rarely reproduces every real error shape, so this is a deliberate pass, not an
assumption
- [ ] Wire real search infra (Meilisearch or equivalent) behind the F8 unified search API,
replacing the mock fixture-based results
- [ ] Stand up the real event bus / webhook delivery system behind F8's mocked "would have sent"
log

---

---

# PART II — BACKEND

Part I built every UI surface against mock modules whose signatures already match the backend
`Protocol` classes. Part II builds the thing behind those signatures. **The contracts do not get
renegotiated here** — if a backend implementation wants a different shape than `lib/contracts/`
has, that is a schema-change PR against the source docs first, updating producer and consumer in
the same PR (platform §8.3.2), not a quiet divergence discovered at integration time.

---

## 5. The four backend laws (non-negotiable, restated from the source docs)

Everything below is an application of these. If a design decision seems to require breaking one,
it is the design that is wrong.

1. **N independent subsystems behind one core** (platform §0). Content, Judge, Lab, Assessment,
   Gamification, Payments, Search, Notifications each own a service boundary and their own tables.
   The core never learns a subsystem's internals. **No subsystem may put a foreign key or a join
   into another subsystem's tables** (platform §4.2, §8.1) — cross-subsystem data goes over the
   event bus or a published read-API.
2. **Events are the only coupling** (platform §4.3, gamification §4). Every event carries
   `event_id`, `schema_version`, `idempotency_key`, `session_fingerprint`. A redelivered event is a
   no-op, never double XP. A schema change bumps the version and updates every consumer in the
   same PR.
3. **Only the ledger → resolver → projection path may mutate a score** (gamification §2.6, §8.2).
   No route, no service, no admin script writes XP or rank directly. This is the one rule in the
   gamification doc with zero exceptions, and it is the rule the frontend has already been built
   to respect (build §3: no client-side XP math, even in mock form).
4. **Deterministic scoring, never AI** (platform §2.9, gamification §7.5). Verdicts, grades, XP,
   rank thresholds, streak decay, promotion cutoffs are named constants and testable Python.
   Claude is allowed to write narrative copy on top of already-computed numbers, and nothing else.
   CI enforces this with an import-linter rule: `gamification/context/*` and `judge/grader.py`
   have zero ML/AI imports.

A fifth, operational one, specific to the two dangerous subsystems: **a sandbox or network config
change is a security change** (platform §8.1), reviewed from outside the squad even when the diff
looks like a bug fix.

---

## 6. Backend stack (locked — consolidated from platform §2 and gamification §2)

No substitutions, no per-engineer version choices, one lockfile per side (`uv` for Python).

### 6.1 Runtime & data

| Thing | Version | Notes |
| --- | --- | --- |
| Python | 3.12.x | Core, Judge orchestrator, Lab orchestrator, Gamification Engine |
| Node.js | 22 LTS | Frontend only |
| PostgreSQL | 16.x + TimescaleDB | Relational + `xp_ledger` hypertable (partitioned by time) |
| Redis | 7.x | Cache, Arq queues, leaderboard sorted sets, streak/combo state, rate-limit buckets |
| Go | 1.23.x | **The one deliberate exception**, scoped to two files: container-lifecycle hot path in the Judge/Lab orchestrator. Requires its own ADR. Everything else is Python. |

### 6.2 Core services

| Layer | Library | Version | Purpose |
| --- | --- | --- | --- |
| Web framework | FastAPI | 0.115.x | Every subsystem's API |
| ASGI | Uvicorn + gunicorn | 0.32.x | |
| Validation | Pydantic | 2.9.x | The contracts between core and every subsystem |
| ORM | SQLAlchemy 2.0 async (`AsyncSession` only) | 2.0.x | |
| Migrations | Alembic | 1.13.x | **Per-subsystem namespaces** — `alembic/versions/{subsystem}/` |
| DB driver | asyncpg | pinned | |
| Auth | PyJWT + `pwdlib[argon2]` | pinned | Per `fastapi-backend-sop.md`. No passlib, no python-jose. |
| Task queue | Arq (Redis-backed) | pinned | Judge submissions, lab provisioning, transcode, certificates, share cards, nightly recompute, league resets |
| Event bus | Redis Streams | v1 | Kafka/Redpanda only if fan-out outgrows Streams |
| Rate limiting | fastapi-limiter | pinned | Judge submit is the single most abusable route on the platform |
| Search | Meilisearch (self-hosted) | pinned | Not Elasticsearch (platform §2.9) |
| Payments | Razorpay (India, primary) + Stripe (intl) | pinned | Hosted checkout only, no card data ever touches our servers |
| Email | Postal (self-hosted) → SES if deliverability suffers | pinned | Receipts, credential issuance, streak digests |
| Push | Web Push (VAPID) via `pywebpush` | pinned | PWA-first, no native push infra in v1 |
| HTTP client | httpx | 0.27.x | Outbound webhooks, share intents |
| Hashing | `hashlib` SHA-256 (stdlib) | — | Ledger hash chain — no dependency needed |
| Credentials | PyJWT + Ed25519 via `pynacl` | pinned | W3C VC / Open Badges v3 shape without a heavyweight library |
| Share cards | Pillow + Resvg, or headless Playwright HTML render | pinned | Server-rendered and deterministic — an LLM never designs the card |
| Logging | structlog | pinned | |
| AI client | `anthropic` | pinned | **Narrative only.** Season recaps, nudges, "what to review next". Never a score. |

### 6.3 Judge & Lab isolation stack (the highest security bar)

| Layer | Choice | Notes |
| --- | --- | --- |
| Judge sandbox | gVisor (`runsc`) as the container runtime | Syscall filtering, not just namespaces/cgroups. Plain Docker for user code is on the do-not-use list. |
| Lab isolation | Firecracker microVMs via Kata Containers as the K8s runtime class | Labs need a fuller environment than a judge sandbox; microVM isolation at container density |
| Orchestration | Kubernetes — k3s on the homeserver for dev/staging, managed nodes for prod burst | Shared cluster, **separate namespace + node pool** for Judge vs Lab |
| Language images | Pinned per language: Python 3.12 first (Phase 1 slice), then Node 22, Java 21, C++/GCC 14, Go 1.23, Rust 1.8x | Minimal, non-root, network-disabled base images |
| Resource limits | cgroups v2 — CPU time, memory, PID count, wall clock, disk I/O | Applied per submission. A language-image default is not a security control. |
| Network | Default-deny `NetworkPolicy`; egress-denied namespace per lab session; session-private virtual network for multi-box labs | No sandbox gets default internet egress, ever |
| Terminal bridge | ttyd (WebSocket-to-TTY) behind the platform's own auth proxy | Browser never gets a direct IP to the microVM |
| GUI bridge | Apache Guacamole (RDP/VNC over WebSocket), only for labs declaring a GUI requirement | Not the default — density matters |
| Plagiarism | MOSS or self-hosted JPlag, async post-submission | Never auto-fails; feeds the same integrity review queue |
| Runtime monitoring | Falco inside the Judge/Lab cluster | Defense in depth, not a replacement for the sandbox |

### 6.4 Content pipeline

FFmpeg (multi-bitrate HLS on upload) → Shaka Packager (manifest generation) → MinIO/S3 (raw +
renditions) → Cloudflare CDN (segment edge cache) → signed, short-TTL per-session HLS URLs with a
burned-in user-ID watermark. **No DRM in v1**; Widevine/FairPlay only against measured piracy
evidence. Permanent unsigned public video URLs are on the do-not-use list. Lesson text is MDX,
versioned like code. Uploaded-material moderation uses PaddleOCR plus deterministic keyword rules.

### 6.5 Infra & DevOps

Docker + docker-compose for local dev and the core API/DB (per OX1's "don't over-engineer until
scaling demands it") · Kubernetes **only** for Judge pods and Lab microVMs · Gitea + Gitea Actions
· Traefik ingress for the K8s subsystems, Nginx Proxy Manager for the core · `uv` / `pnpm` ·
pre-commit (ruff, black, mypy, bandit, gitleaks) · Prometheus + Grafana (queue depth, pod
lifecycle duration, lab provisioning latency, event-bus lag, ledger recompute duration) · Loki
(centralized logs including judge/lab pod stdout) · Sentry (when a project exists) · MLflow
(anti-cheat/plagiarism model tracking, only if those graduate past heuristics).

---

## 7. Repo & service layout

```
platform/
├── contracts/                # §4.1 Protocol interfaces + shared Pydantic models
│   ├── content.py            #   ContentProvider
│   ├── judge.py              #   JudgeEngine
│   ├── labs.py               #   LabEngine
│   ├── assessments.py        #   AssessmentEngine
│   └── payments.py           #   PaymentProvider
├── core/                     # auth, RBAC, multi-tenancy, subsystem registry, gateway
├── events/                   # BaseEvent + every typed event subclass, versioned
└── bus/                      # Redis Streams producer/consumer, idempotency, DLQ

content/                      # courses, lessons, enrollments, video pipeline, CMS
judge/
├── api.py                    # submit / get_result — never executes inline
├── orchestrator/             # pod lifecycle (Go hot path lives here, and only here)
├── grader.py                 # deterministic diff — zero AI imports, CI-enforced
└── plagiarism/               # MOSS/JPlag async scan
labs/
├── api.py                    # provision / terminate / check_objective
├── orchestrator/             # namespace + microVM lifecycle
├── manifests/                # declarative YAML per lab — a lab is a plug-in
└── bridge/                   # ttyd + Guacamole auth proxy
assessments/                  # question bank, grading.py, anti-cheat telemetry, certificates
gamification/                 # exactly the layout in gamification §5.5 — do not reorganize it
├── events/schema.py
├── integrity/{gate,ledger_hash,credentials}.py
├── context/{schema,rank,streaks,leagues,resolver}.py
├── projections/{leaderboard,badges,share_cards,skill_tree,quests,...}.py
├── rules.py                  # ALL named thresholds live here and nowhere else
└── tests/acceptance/
commerce/                     # orders, subscriptions, entitlements, webhooks
search/                       # Meilisearch indexing pipeline + query API
notifications/                # email (Postal/SES), web push, in-app notification feed
admin/                        # CMS backend, moderation, audit log, analytics read models
alembic/versions/{subsystem}/ # one namespace per subsystem — no cross-subsystem merge conflicts
```

The frontend's `lib/contracts/` is the hand-transcribed mirror of `platform/contracts/` plus
`gamification/context/schema.py`. §11 is the diff-and-reconcile pass between them.

---

## 8. Build order — B0 → B9

Same discipline as Part I: a section is not done because the code exists, it is done when its
acceptance fixtures are frozen and green and its security checklist (§12) is signed off. Critical
path from platform §9: **Platform Core unblocks everyone; Judge Engine and Lab Engine are the true
bottleneck pods.**

Parallelism: B1 can start as soon as B0's auth is stable. B2 and B3/B4 run in parallel — Content
and Gamification touch nothing of each other's, they meet only at an event. B5 and B6 should not
start until B0–B1 are frozen, because a security-critical subsystem built against a moving contract
is how a rushed sandbox config ships.

### B0 — Platform Core (nothing ships until this does)

- [ ] `docker-compose.yml`: Postgres 16 + TimescaleDB, Redis 7, MinIO, Meilisearch, Postal —
identical stack per engineer, one command to bring up
- [ ] FastAPI app skeleton per `fastapi-backend-sop.md` layering: routes → services → repositories,
`Annotated[T, Depends(...)]` everywhere, no business logic in a route body
- [ ] Auth: PyJWT access/refresh, argon2 via `pwdlib`, `jti` denylist on logout/revocation —
this replaces the frontend's mock session provider (build §4)
- [ ] RBAC + multi-tenancy: `user`, `instructor`, `org_admin`, `platform_ops`; `org_id` scoping
threaded through every query, enforced at the repository layer, not per-route
- [ ] `platform/contracts/` — the `Protocol` classes from platform §4.1, verbatim, as the single
source of truth every subsystem imports
- [ ] Subsystem registry + feature-flag gate: "for each subsystem, validate against its contract,
register, expose via flag" written **once**, never edited when a new subsystem is added
- [ ] Alembic with per-subsystem version namespaces wired before the first migration exists
- [ ] Rate limiting (fastapi-limiter) with per-route budgets; the Judge submit route gets the
tightest one on the platform
- [ ] structlog with request/trace IDs, Prometheus metrics endpoint, Loki shipping
- [ ] Append-only audit-log primitive, shared: every admin/moderation/review action writes here
- **Exit gate:** a synthetic user registers, logs in, hits a flagged-off stub subsystem and gets a
clean contract-shaped 404/403 rather than a stack trace.

### B1 — Event bus & event contract

- [ ] `platform/events/`: `BaseEvent` exactly as gamification §4 — `event_id`, `event_type`,
`schema_version`, `user_id`, `org_id`, `occurred_at`, `idempotency_key`, `session_fingerprint`,
`payload`
- [ ] Typed subclasses, literal values matching the frontend's transcription byte-for-byte:
`course.completed`, `assessment.submitted`, `side_assessment.submitted`, `login.recorded`,
`judge.submission_graded`, `lab.session_completed`, `payment.succeeded`
- [ ] Redis Streams producer + consumer-group wrapper: at-least-once delivery, consumer-group per
subsystem, dead-letter stream, replay-from-offset tooling
- [ ] **Idempotency table** keyed on `idempotency_key` — redelivery is a no-op. Test it by
delivering the same event twice and asserting one ledger entry.
- [ ] `raw_submission_ref` blob storage: `question_level_answers` and any raw payload stored
verbatim **before** any scoring runs — same "never discard raw" law as OX1's `ai_analysis_logs`
- [ ] Schema-version registry + a CI check that fails a PR changing an event schema without
bumping the version and touching every consumer
- **Exit gate:** a hand-emitted event flows producer → stream → consumer → idempotency check, and
a replay of the same event changes nothing.

### B2 — Content Engine

- [ ] Tables: `courses`, `lessons`, `modules`, `enrollments`, `lesson_progress`, video metadata
- [ ] `ContentProvider.get_course` and `get_playback_manifest` implemented against `platform/contracts/`
- [ ] Upload → Arq transcode job → FFmpeg multi-bitrate ladder → Shaka Packager → MinIO renditions
- [ ] Signed, short-TTL, per-session HLS URLs + user-ID watermark burn-in at serve time; expired
URL returns 403 (this is an explicit test tier, platform §8.2)
- [ ] MDX lesson storage and rendering pipeline for article lessons
- [ ] Course versioning per platform §4.4: `draft` and `published` versions, enrolled users pinned
to the version they enrolled against unless they opt into an update
- [ ] **Two-person publish enforced in code** — the `published` state transition requires a
`reviewer_id` distinct from the author, audit-logged. The F7 UI already mirrors this flow.
- [ ] Enrollment + progress tracking; emits `course.completed` at 100% only (never partial)
- [ ] Content moderation hook: PaddleOCR + deterministic keyword rules on uploaded materials
- **Exit gate:** a course is authored, reviewed by a second account, published, enrolled in,
played end-to-end via signed manifest, completed, and a `course.completed` event lands on the bus.

### B3 — Ledger & Integrity (most senior pod, the trust boundary)

- [ ] `xp_ledger` as a TimescaleDB hypertable, append-only, partitioned by time; `LedgerEntry`
exactly as gamification §5.3 including `prev_hash`, `entry_hash`, `integrity_status`
- [ ] `integrity/ledger_hash.py`: `compute_entry_hash` per gamification §7.2, plus full-chain and
checkpoint-segment verification. **A broken link halts computation and pages on-call** — it never
logs a warning and continues.
- [ ] `integrity/gate.py` — heuristic v1, no ML: velocity check, answer-timing distribution,
session-fingerprint reuse, retry-pattern anomaly, device/network graph signal, each contributing
to a `confidence_score`
- [ ] Gate outcome semantics, exactly as specified: below threshold **still writes to the ledger**
with `integrity_status = flagged`, freezing public visibility only. **Flagging never deletes XP.**
- [ ] Review queue: RBAC-gated to `org_admin`/`platform_ops`, showing raw event + flag reasons +
confidence breakdown + recent ledger history; actions are **clear / reverse / escalate**, where
`reverse` writes a compensating `adjustment` entry and never deletes the original
- [ ] Every reviewer action is itself audited and timestamped
- [ ] Nightly Arq job: re-verify a random sample of chains as continuous reconciliation
- [ ] All thresholds in `rules.py`, named and versioned — no inline magic numbers anywhere
- **Exit gate:** `verify_ledger_chain(tampered_middle_entry=True)` raises `ChainIntegrityError`;
a flagged event still accrues private XP while public visibility freezes.

### B4 — Progress Context Engine & projections

- [ ] `context/schema.py` — `ProgressContext`, `RankState`, `StreakState`, `LeagueStanding`,
`GuildRollup`, frozen once computed, `context_version` increments and old versions are never
overwritten
- [ ] `context/rank.py` — dual-track resolution: Completion XP and Mastery XP summed
independently, weighted into a level. **Never one blended input number.** Zero ML imports,
import-linter enforced. Prestige resolves separately and only on deliberate user opt-in.
- [ ] `context/streaks.py` — freeze-token consumption, momentum multiplier, grace period, decay
constants named in `rules.py`
- [ ] `context/leagues.py` — season-sliced standings, promotion/relegation zones, guild rollup
- [ ] `context/resolver.py` — orchestrates gamification §5.4 steps 1–7 in order, hash-chain
verification **first**, integrity freeze check at step 6
- [ ] `projections/leaderboard.py` — Redis sorted sets (`ZADD`/`ZRANGE`), global + guild +
org-scoped key namespaces. This is the most-hit read path in the product; budget is sub-100ms p99.
- [ ] `projections/badges.py` + `integrity/credentials.py` — W3C-VC-shaped JSON, Ed25519-signed,
stored in MinIO, exposed at a permanent public `/verify/{credential_id}` that re-verifies the
signature live and flips to `revoked` when underlying entries are reversed
- [ ] `projections/share_cards.py` — server-rendered canonical PNG with `credential_id` embedded
as visible text **and** a QR code; the frontend's `html-to-image` preview stays a preview
- [ ] `projections/skill_tree.py`, `percentiles.py` (nightly Arq, never per-request),
`quests.py`, `season_pass.py`, `duels.py`, `cosmetics.py`
- [ ] Arq schedulers: season open/close, nightly recompute, rank-decay display dimming (dims a
display flag, **never deletes XP**), badge issuance
- [ ] SSE endpoints for combo meter and leaderboard ticks; the server recomputes and the server
value wins on any conflict with the client preview
- [ ] Frozen acceptance fixtures in `gamification/tests/acceptance/`: known ledger in, known
`ProgressContext` out, including the mandatory regression table in gamification §8.3
- **Exit gate:** the regression table passes exactly — `resolve_rank(0, 0) → Initiate`,
`resolve_rank(36000, 36000) → Deus`, both `apply_streak_decay` cases, both `credential_verify`
cases, and the chain-tamper case.

### B5 — Judge Engine (highest security bar — no shortcuts, no "temporarily")

- [ ] Tables: `problems`, `submissions`, `test_cases` (hidden); ephemeral pod state stays in K8s,
never in Postgres
- [ ] `POST /judge/submit`: rate-limit check → submission size cap → language allow-list →
**enqueue to Redis Streams and return 202 + `submission_id` immediately.** Never executes inline.
The frontend's optimistic-submit flow is already built against this exact shape.
- [ ] Arq worker: fresh gVisor pod from the pinned language image per submission, cgroups v2 caps
applied per submission, no network egress, sequential run against hidden test cases capturing
stdout/stderr/exit code/timing per case, **pod destroyed immediately after grading and never
reused — not even for the same user**
- [ ] `judge/grader.py`: deterministic diff, exact-match plus optional custom checker for float
tolerance and unordered output. Zero AI imports, CI-enforced.
- [ ] `JudgeResult` persisted with raw output stored verbatim; verdict literals exactly
`accepted` / `wrong_answer` / `time_limit_exceeded` / `runtime_error` / `compile_error`
- [ ] SSE result stream to replace the frontend's mock polling
- [ ] `judge.submission_graded` emitted to the bus → Gamification, and Assessment when the
submission carries an assessment context
- [ ] Async MOSS/JPlag scan on a separate path — **never blocks the user's result**; similarity
above threshold files into the same integrity review queue as B3
- [ ] **Python only for Phase 1.** Additional language images are each a separate security-checklist
PR. Do not widen the allow-list to "unblock" a frontend that was deliberately built single-language.
- [ ] Adversarial fuzz suite in a dedicated test cluster: fork bombs, network probes, disk-fill,
PID exhaustion — assert the pod is capped and killed and **no sibling pod is affected**
- **Exit gate:** 100% fuzz-suite pass (any failure blocks release, full stop) + 100% grader
agreement with the hand-verified acceptance fixture set + security review signed off from outside
the squad.

### B6 — Lab Engine (highest blast radius)

- [ ] Tables: `labs`, `lab_sessions`, `lab_objectives`
- [ ] Declarative YAML manifest per lab — base images, network topology, objective/flag
definitions, hint ladder. **A lab is a plug-in**; the orchestrator never hard-codes one.
- [ ] `POST /labs/{lab_id}/sessions`: concurrent-session cap per user (cost control) + manifest
validation → provision a **dedicated K8s namespace per session**, torn down completely on end and
never reused pre-teardown
- [ ] Firecracker microVMs via Kata per the manifest (e.g. attacker + target boxes) on a
session-private virtual network
- [ ] Default-deny `NetworkPolicy`: no path to the public internet, no path to another session.
**This is the platform's highest-severity failure mode if it breaks.**
- [ ] ttyd and Guacamole proxied through the platform's auth layer — the browser never receives a
direct IP to a microVM. Replaces the frontend's scripted mock WebSocket.
- [ ] `check_objective()` runs a **scoped server-side read against the session's real state via the
orchestrator's control plane.** It never trusts a value the browser sends. This is the single most
common way lab platforms get cheated and it is closed structurally.
- [ ] Arq session lifecycle: provision → hard timeout (60–120 min, per-lab configurable) →
force-terminate → destroy. Time-boxing is a cost control *and* a security control.
- [ ] `lab.session_completed` emitted with `objectives_completed`, `time_taken_seconds`, `hints_used`
- [ ] Falco rules active in the cluster
- [ ] Cross-session reachability probe suite: attempt Session A → Session B, assert denied
- **Exit gate:** a red-team pass confirms objective checks cannot be spoofed from the browser
console, and zero successful cross-session reach.

### B7 — Assessment Engine

- [ ] Tables: `assessments`, `questions`, `assessment_submissions`; question bank versioned,
namespaced per course, **difficulty as a static versioned field** (feeds the Clutch bonus) — never
model-inferred at score time
- [ ] `assessment/grading.py`: deterministic exact/fuzzy match for MCQ and short answer. Never AI.
- [ ] Code questions **delegate to the Judge Engine** — an assessment code question *is* a judge
submission with assessment context attached. One grading truth, not two.
- [ ] Anti-cheat telemetry ingestion: tab-visibility, paste events, timing — feeds **the existing**
`gamification/integrity/gate.py`, not a second gate. The frontend hooks are already stubbed and
emitting; this gives them a real endpoint.
- [ ] Attempt tracking + retry-with-decay enforced **at ledger-write time**, not at display time
- [ ] Certificates: WeasyPrint or the org's Puppeteer `pdf-service`, server-rendered, hash-stamped,
same verify-URL pattern as badges
- [ ] Emits `assessment.submitted` / `side_assessment.submitted` with `question_level_answers`
stored raw before scoring
- **Exit gate:** an assessment containing MCQ, short-answer, and code questions grades end-to-end,
the code question's verdict comes from the Judge Engine, and the resulting XP appears on the ledger
with the side-assessment multiplier recorded in `multiplier_applied`.

### B8 — Commerce

- [ ] Tables: `orders`, `subscriptions`, `invoices`, `entitlements` — tightest RBAC on the platform
- [ ] `PaymentProvider` implemented twice: Razorpay (primary, India) and Stripe (international),
both hosted-checkout only. **No raw card number ever touches our servers.** PCI scope stays with
the provider.
- [ ] `create_checkout(cart)` → `CheckoutSession`; the F6 UI already consumes this shape
- [ ] `verify_webhook(raw_payload, signature)` on **every** provider callback; signature-tamper
rejection tested, idempotency keys on every charge, replay-safe fulfillment
- [ ] Entitlement service: the single authority the Content and Lab engines query for "may this
user access this thing" — replaces the F6 mock gating
- [ ] Subscriptions + B2B seat licensing, org-scoped
- [ ] `payment.succeeded` on the bus → entitlement grant → notification
- [ ] Reconciliation job against the provider dashboard; **a payments discrepancy is a P0**
- **Exit gate:** webhook replayed twice produces exactly one `payment.succeeded` and no
double-fulfillment; a real sandbox purchase → entitlement → content access loop works end to end.

### B9 — Supporting subsystems

- [ ] **Search:** Meilisearch indexing pipeline consuming Content/Judge/Lab publish events; unified
query API behind the shape `lib/api/search.ts` already mocks. Freshness SLA under a minute,
sub-50ms p95 query.
- [ ] **Notifications:** email (Postal/SES) for receipts, credential issuance, streak digests; Web
Push via VAPID; in-app notification feed backing the F0 notification-center shell, with event
fixtures per type already defined by the frontend
- [ ] **Admin/CMS backend:** authoring APIs, moderation actions, the append-only audit log read
API, and analytics read models (DAU/WAU, completion funnel, checkout conversion, revenue) — built
as **read models over events**, never as ad-hoc cross-subsystem joins
- [ ] **Public API + outbound webhooks (F8):** signed outbound events (`enrollment`, `completion`,
`credential.issued`) with delivery retry and a dead-letter view, plus a documented public read API.
This is what makes chapter-level/partner-community completion data verifiable externally.

---

## 9. Endpoint surface (first pass — contract-shaped, not exhaustive)

| Method | Route | Contract | Frontend consumer |
| --- | --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/refresh` | — | mock session provider (F0) |
| GET | `/courses`, `/courses/{id}` | `Course` | `lib/api/content.ts` |
| GET | `/lessons/{id}/manifest` | `SignedManifest` | course player (F1) |
| POST | `/courses/{id}/enroll`, `/lessons/{id}/progress` | — | F1 |
| POST | `/judge/submit` → 202 | `SubmissionAccepted` | `lib/api/judge.ts` |
| GET | `/judge/submissions/{id}` · SSE `/judge/submissions/{id}/stream` | `JudgeResult` | F2 |
| POST | `/labs/{id}/sessions` · DELETE `/labs/sessions/{id}` | `LabSession` | `lib/api/labs.ts` |
| POST | `/labs/sessions/{id}/objectives/{objective_id}/check` | `ObjectiveResult` | F3 |
| WS | `/labs/sessions/{id}/terminal` | ttyd bridge | xterm.js (F3) |
| POST | `/assessments/{id}/attempts`, `/attempts/{id}/submit` | `GradeResult` | `lib/api/assessments.ts` |
| GET | `/me/progress` | `ProgressContext` | `lib/api/gamification.ts` |
| GET | `/leaderboards/{scope}` · SSE `/leaderboards/{scope}/stream` | `LeagueStanding[]` | F5 |
| GET | `/verify/{credential_id}` (public, unauthenticated) | credential status | F5 verify page |
| POST | `/cart`, `/checkout` · POST `/webhooks/{provider}` | `Cart`, `CheckoutSession` | F6 |
| GET | `/search?q=` | unified search | F0 command palette |
| GET | `/admin/audit`, `/admin/analytics/*` | — | F7 |

---

## 10. Frontend integration — the swap, module by module

Part I's §4 checklist is now live work, not a future note. The swap is one module at a time,
behind a per-module env flag so mock and real can coexist during cutover:

| Frontend module | Becomes | Notes |
| --- | --- | --- |
| `lib/api/content.ts` | B2 endpoints | Signed manifest URLs are now short-TTL — the player needs refresh-on-expiry, which the mock never exercised |
| `lib/api/judge.ts` | B5 endpoints | Mock interval polling → real SSE |
| `lib/api/labs.ts` | B6 endpoints | Scripted terminal transcript → real authenticated WebSocket |
| `lib/api/assessments.ts` | B7 endpoints | Anti-cheat hooks stop logging to console and start POSTing |
| `lib/api/gamification.ts` | B4 endpoints | Combo meter SSE becomes real; server value wins on conflict |
| `lib/api/payments.ts` | B8 endpoints | Sandbox hosted checkout is already real — the swap is order/entitlement state |
| `lib/api/search.ts` | B9 Meilisearch | Fixture results → real index |
| mock session provider | B0 auth | Real JWT, refresh rotation, `jti` denylist |
| `html-to-image` share card | B4 canonical render | Client preview stays; the shared artifact becomes server-rendered |

Then, per Part I §4: diff every hand-transcribed enum against the real Pydantic models
(`verdict`, `integrity_status`, `league_tier`, credential `status`, review `status`, quest
`status`), and deliberately re-run the F2–F5 state matrix against real data. A mock rarely
reproduces every real error shape — this is a pass, not an assumption.

---

## 11. Backend work for the newer frontend scope

The two source docs are v1.0 and predate the items in Part I marked "recently added." These need
backend design **before** their frontend counterparts are wired, and each one still obeys §5:

| Frontend item | Backend shape | Watch out for |
| --- | --- | --- |
| Lesson discussions / Q&A | New `discussions` tables in Content Engine; moderation via the shared audit log | Needs its own rate limiting and abuse reporting — a new user-generated-content surface is a new spam surface |
| Course reviews & ratings | `reviews` in Content Engine; aggregate rating as a projection, not a live `AVG()` on every card render | Verified-purchase gating via the B8 entitlement service |
| Instructor/mentor analytics | Read models over events, org- and author-scoped | **Never** a cross-subsystem join into enrollment tables (§5.1) |
| Course completion certificates | Reuses B7's certificate renderer and the credential verify URL — but it is a **distinct contract** from a skill badge | Don't collapse the two; a course certificate and a mastery badge make different claims |
| In-player notes & bookmarks | Content Engine, user-scoped, timestamp-keyed; markdown/PDF export via Arq | Private data — tighter RBAC than course content |
| Judge editorial / peer solutions | Unlock condition evaluated **server-side** in B5; solution list sanitized and ranked by runtime/memory | Unlock must not be inferable client-side; sanitize before exposing another user's code |
| Contest mode | Time-boxed problem set over the existing submit path + a season-style frozen leaderboard | Reuse the league season machinery; don't build a second scheduler |
| Lab hints with XP cost | The deduction is a **ledger entry** (`reason_code: HINT_USED`), never a client-side subtraction | It is its own line item — never blended into Completion or Mastery XP |
| Post-lab writeups | New `lab_writeups` with `pending_review` / `graded` status, feeding the same review queue | Human-graded, so it needs its own reviewer RBAC role |
| Team lab sessions | Multi-participant session model + terminal fanout in B6 | Isolation review is **from scratch** — the single-user proof does not carry over to a shared namespace |
| Mentorship / referral XP | New reason codes and a distinct XP source, traceable in the ledger like every other grant | Referral XP is the most farmable mechanic on the platform — the Integrity Gate needs a specific check before this ships |
| Guild quests | `projections/quests.py` extended to a guild-scoped, time-boxed quest contract | Rewards are ledger entries like everything else |
| Public profile pages | Read projection over `ProgressContext` + badges, respecting `freeze_status` | A frozen-pending-review user must not be publicly visible — the freeze has to apply here too |
| Admin analytics dashboard | Read models over events, nightly Arq rollups | Per-request aggregation over the ledger will not hold at scale |

---

## 12. Gates, testing tiers, and Definition of Done

### 12.1 Mandatory review gates

- [ ] A PR touching Judge or Lab **sandbox or network configuration** requires security review from
outside the squad — including when it looks like a bug fix ("tests were timing out")
- [ ] No PR adds a foreign key or query across a subsystem boundary
- [ ] A new language runtime image or lab manifest ships with a security checklist: no default
network, resource limits declared, no privilege-escalation path, reviewed before enablement. An
unreviewed image is a **blocked deploy**, not an incomplete task.
- [ ] Content publish transitions require a second `reviewer_id`, enforced in the CMS
- [ ] Payment-path changes require a staging dry-run against provider sandbox, with the test
transaction ID in the PR description
- [ ] No route or service writes XP or rank outside `gamification/context/` or `integrity/`
- [ ] Ledger-writing changes ship with a hash-chain tamper-detection regression test
- [ ] Integrity-gate threshold changes require a second reviewer from outside the squad
- [ ] Any new event type bumps its schema version and updates every consumer in the same PR

### 12.2 Testing tiers

| Tier | Scope | Example |
| --- | --- | --- |
| Unit | Pure functions — rank resolution, streak decay, hash computation, grader diff | `resolve_rank(5000, 3000) == (Level.ATLAS, ...)` |
| Integration | Event → gate → ledger → context recompute against a throwaway Postgres | Emit `CourseCompletedEvent`, assert the resulting `ProgressContext` |
| Acceptance | Frozen fixtures — known ledger in, known context out | Golden ledger → golden `ProgressContext`, byte-identical on the parts that matter |
| Sandbox escape / fuzz | Judge — adversarial submissions in a dedicated cluster, never prod | Fork bomb: assert pod killed by its cap, no sibling affected |
| Lab isolation | Cross-session network reachability probes | Reach Session B from Session A → `NetworkPolicy` denies |
| Integrity/security | Chain tamper detection, credential signature verification, review-queue RBAC | Corrupt a mid-chain hash → recompute halts and pages |
| Payment | Webhook replay, signature tamper, idempotency collision | Replay a valid webhook twice → one event, no double fulfillment |
| Content | Manifest correctness across the bitrate ladder, signed-URL expiry | Fetch after TTL → 403 |
| Load | Judge queue depth under burst, lab provisioning latency, leaderboard read contention | `k6` against a seeded 100k-user leaderboard |

### 12.3 Definition of Done (backend)

On top of the org's standard DoD:
1. Sandbox-touching code has security-review sign-off attached to the PR.
2. New event types are versioned with all consumers updated in the same PR.
3. Content changes went through two-reviewer publish, verifiable in the audit log.
4. No score is written outside the resolver.
5. The acceptance fixture is frozen and green.
6. Any new public status artifact links to a verify URL, and that URL is tested to show `revoked`
after a simulated reversal.
7. Task status updated in `docs/BUILD_PLAN.yaml` in the same PR.

---

## 13. What to explicitly NOT build yet (backend edition)

- ❌ Running user code under plain Docker without gVisor "just for local dev convenience" — a
container alone is not a security boundary, and a dev shortcut becomes a staging default
- ❌ Any default internet egress for a judge or lab sandbox — explicit allow-list, default deny
- ❌ Any code path where a card number reaches our servers
- ❌ LLM-graded verdicts, scores, or XP — narrative copy only
- ❌ A shared K8s namespace between two lab sessions, or namespace reuse before teardown
- ❌ Elasticsearch — Meilisearch until catalog size genuinely outgrows it
- ❌ Permanent unsigned public video URLs
- ❌ Un-hash-chained ledger writes, including from a migration or a hotfix script
- ❌ A badge "verified" boolean with no signature behind it
- ❌ Kafka in v1 — Redis Streams until fan-out proves insufficient
- ❌ Multi-language Judge support ahead of the Phase 1 Python slice
- ❌ Real multi-user terminal fanout before B6's single-user isolation is red-team clean
- ❌ A trained anti-cheat model before there is labeled abuse data — heuristics first, and the
model only replaces them when it beats the baseline on precision/recall against reviewed cases
- ❌ Loot boxes or any paid randomized reward — legal/ethics review before it is an eng ticket

---

## 14. Phase alignment & evaluation bars

| Phase | Sections | Exit gate |
| --- | --- | --- |
| 0 — Foundation | B0, B1, B2, B3, B4 | A synthetic user registers, watches a course, completes it, and sees correct XP/rank; acceptance tests green |
| 1 — Judge vertical slice | B5 (Python only) | Real user submits, gets a correct verdict, XP updates, zero sandbox-escape findings in the fuzz suite |
| 2 — Lab vertical slice | B6 (one lab category) | Real user completes a lab; objective check cannot be spoofed from the browser console, verified by red team |
| 3 — Commerce + full catalog | B7, B8, B9 | Purchase → entitlement → access loop works end to end, webhook replay-tested; search live |
| 4 — Hardening & scale | cross-cutting | Target concurrency held with p99 inside budget, plagiarism detection tuned, zero open critical security findings |

**Bars that block a release outright:** grader agreement 100% on the acceptance fixture set ·
fuzz-suite pass rate 100% · zero successful cross-session lab reach · payments reconciliation 100%
· hash-chain verification 100% · every expired signed URL correctly rejected · credential verify
URL correct and available. Latency budgets: sub-2s p95 video time-to-first-frame, sub-50ms p95
search, sub-100ms p99 leaderboard read.

**Still deliberately unlocked** (platform §12, gamification §12): K8s node-pool sizing, the
Firecracker-vs-gVisor trade-off for lighter labs (start stricter, relax only with evidence),
whether DRM is ever added, Judge language coverage beyond Phase 1, lab snapshot/resume, exact XP
band thresholds, season length and tier names, and whether anti-cheat graduates to a learned model.
