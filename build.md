# Zapsters — BUILD.md (Frontend-first)

**Source docs:** `ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md` (v1.0) + `ZAPSTERS_GAMIFICATION_ENGINE.md` (v1.0)
**Priority:** frontend now, backend later. This plan builds every UI surface against the
**locked contract shapes** already defined in both docs (the `Protocol` interfaces in
platform §4.1, the `ProgressContext`/`RankState`/etc. schemas in gamification §5.3) using a mock
data layer — so when backend lands, integration is a data-layer swap, not a UI rewrite.

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
  exercise every UI state (empty, loading, error, partial, full, edge-case like a `flagged`
  integrity status or a `revoked` credential).

This is the same "consume the contract, not the side-effect" law the gamification doc calls
load-bearing for its own backend (§0) — applying it to the mock layer now is what prevents a
second rewrite later.

---

## 1. Frontend tech stack (locked, from platform §2.7 + gamification §2.3)

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.7+, App Router, Turbopack |
| Language | TypeScript 5.x strict, `noUncheckedIndexedAccess` on |
| UI | Tailwind v4 + shadcn/ui — shared design tokens in `@theme` across every surface |
| Code editor (Judge) | Monaco Editor |
| Terminal (Lab) | xterm.js |
| GUI access (Lab, optional) | Guacamole viewer component (behind a feature flag until Lab backend exists) |
| Video player | video.js |
| Data fetching | TanStack Query 5.x |
| Real-time | SSE for judge-result polling, combo/leaderboard ticks; WebSocket only for the lab terminal (the one place bidirectionality is actually required) |
| Forms | react-hook-form + zod |
| Animation | Framer Motion + `tailwindcss-animate` — rank-up transitions, confetti, combo meter |
| Charts | d3 (skill tree, custom force/tree layout) or recharts (XP history line) |
| Share-card client preview | `html-to-image` (client preview only — canonical file is server-rendered later; mock it as a static PNG for now) |
| Payments UI | Razorpay/Stripe **hosted checkout embeds** — never a custom card-number input, even as a mock |

No backend infra (Postgres, Redis, Kubernetes, gVisor, Kata, FastAPI, Arq) is needed for any of
this phase. That's all deferred to the later backend build.

---

## 2. Build order — UI surfaces, prioritized

Each surface below: build the page/component tree, wire it to `lib/api/`, mock every state
(loading/empty/error/success), and don't move on until it's visually and interactively complete
against the mock — that's what makes it a drop-in once real data exists.

### F0 — Shell & design system (do this first, everything else sits inside it)
- [ ] Tailwind v4 `@theme` tokens + shadcn/ui install, shared across all subsystem UIs
- [ ] App shell: top nav, side nav, auth screens (UI only — no real auth yet, use a mock
  session context/provider)
- [ ] Global layout primitives: page container, card, empty-state, error-state, skeleton loaders
  — build these once, every subsystem below reuses them
- [ ] Route structure scaffolded for all subsystems (`/courses`, `/judge`, `/labs`, `/assessments`,
  `/rank`, `/leaderboards`, `/guilds`, `/checkout`, `/admin`) even if most are stubs initially

### F1 — Content Engine UI (Udemy-shaped)
- [ ] Catalog/browse page (search bar UI wired to a mock Meilisearch response shape)
- [ ] Course detail page: syllabus, enrollment CTA, reviews placeholder
- [ ] Course player: video.js with mock signed-manifest URLs, lesson sidebar, resume-position,
  captions toggle, playback speed
- [ ] Progress indicator per lesson/course (feeds mock `enrollments` state)
- [ ] Mock the `draft` vs `published` distinction in the authoring preview flow (F7) even before
  a CMS exists

### F2 — Judge Engine UI (HackerRank-shaped)
- [ ] Problem list + problem detail (statement, constraints, starter code)
- [ ] Monaco editor pane, language selector (start with Python only, per the backend's own
  Phase-1 language slice — don't build a multi-language picker UI ahead of what's real)
- [ ] Submit flow: optimistic "submitted" state → mock 202 + `submission_id` → poll (mock SSE or
  interval) → render `JudgeResult` (verdict, runtime_ms, memory_kb, test_cases_passed/total)
- [ ] Verdict states styled distinctly: `accepted`, `wrong_answer`, `time_limit_exceeded`,
  `runtime_error`, `compile_error` — these are the exact literal values from the backend event
  schema, use them verbatim so nothing needs remapping later
- [ ] Result history per problem/user

### F3 — Lab Engine UI (TryHackMe-shaped)
- [ ] Lab catalog + lab detail (objectives list, difficulty, estimated time)
- [ ] "Start Lab" flow: mock session provisioning state → xterm.js terminal wired to a **mock
  WebSocket** (echo server or scripted transcript) so the terminal UX is real even with no
  backend
- [ ] Session timer (countdown to hard timeout), objectives panel with live check-off
- [ ] Guacamole GUI viewer stub for labs that declare a GUI requirement (build the container/UI
  chrome now, real RDP/VNC stream comes with the backend)
- [ ] Session-end / timeout UI states

### F4 — Assessment Engine UI
- [ ] Question flow (MCQ, short-answer, code-question which reuses the F2 Monaco component)
- [ ] Timer, attempt tracking, submit confirmation
- [ ] Live combo/multiplier meter (SSE-driven in prod; mock with a scripted interval for now) —
  this is explicitly "the dopamine layer," worth getting the animation feel right early
- [ ] Anti-cheat telemetry hooks stubbed (tab-visibility, paste-event listeners) — wire the event
  capture now even though it just logs to console/mock until there's a real Integrity Gate to
  send it to

### F5 — Gamification UI (this is most of the "showoff" surface area)
- [ ] Rank ladder page: all 10 levels + Prestige tiers, current position highlighted, using the
  exact rank names from gamification §5.2 (Initiate → Deus)
- [ ] XP bars: Completion XP and Mastery XP shown as **two distinct tracks**, never blended —
  match the backend's "never one blended number" rule visually, not just structurally
- [ ] Streak widget: current streak, freeze tokens available, momentum multiplier, grace-period
  state
- [ ] Global + guild leaderboards (mock `ZRANGE`-shaped paginated data)
- [ ] Guild boards: member list, combined XP, guild-vs-guild comparison
- [ ] Season/league standing: tier badge (bronze→obsidian), promotion/relegation zone indicator
- [ ] Skill tree visualization (d3 force/tree layout) over mock category-XP distribution
- [ ] Badge wall + individual badge detail with a "Verify" link (mock verify page showing
  `verified` / `flagged` / `revoked` states — build all three, not just the happy path)
- [ ] Share-card modal: client preview via `html-to-image`, "Download/Share" button pointing at
  a mock canonical PNG for now
- [ ] Season Pass track UI (free + premium milestones), duels, daily quests — lower priority
  within F5, sequence last if time-constrained

### F6 — Commerce UI
- [ ] Cart + checkout page using Razorpay/Stripe **hosted checkout embeds** in sandbox/test mode
  (real test-mode integration is fine to wire early since it's provider-hosted, not custom)
- [ ] Subscription/B2B seat management screens (can stay mock-only until Commerce backend exists)
- [ ] Entitlement gating UI: locked-content states for unpurchased courses/labs

### F7 — Admin/CMS UI (lowest priority — build last, or only stub it)
- [ ] Course authoring: draft editor, preview link, "submit for review" → second-reviewer
  publish flow (UI mirrors the two-person review rule even before it's enforced server-side)
- [ ] Problem/lab authoring stubs
- [ ] Moderation/audit-log view (mock append-only log rendering)

---

## 3. What to explicitly NOT build yet

Keep the frontend honest about what's real vs. mocked — don't let convenience mocks quietly
become assumptions that don't hold once backend exists:

- No real auth/session persistence — a mock provider is fine, don't wire a real JWT flow until
  Platform Core exists
- No real WebSocket to an actual terminal or microVM — script the xterm.js feed
- No real payment capture — hosted checkout sandbox only, never a custom card field regardless
  of mock/real status (this rule applies even in mock form, per the do-not-use list)
- No client-side XP/rank calculation logic — even in mock form, compute rank purely by calling
  the mock `lib/api/gamification.ts`, never re-derive it in a component. This is the one habit
  most worth enforcing early, since "the client previews, the server always wins" is a hard rule
  in the real system — building the frontend as if the client is authoritative now creates real
  rework later.
- No LLM-graded anything in the UI's mocked responses (verdicts, scores) — keep mock data
  deterministic and literal-matching the enums, so the later swap doesn't also require a UI logic
  change

---

## 4. Integration checklist (for when backend build starts)

Keep this here now so the frontend is built with it in mind, not discovered later:

- [ ] Swap each `lib/api/*.ts` function body from "return mock fixture" to "call the real
  endpoint" — signatures shouldn't need to change if the contracts were transcribed correctly
  in step 0
- [ ] Replace mock WebSocket/SSE sources with real ones (judge polling, lab terminal, combo
  meter, leaderboard ticks)
- [ ] Replace the mock auth/session provider with real Platform Core auth
- [ ] Replace the `html-to-image` client-only share card with the real flow: server-rendered
  canonical artifact wins, client preview stays as-is
- [ ] Verify every enum/literal used in the UI (`verdict`, `integrity_status`, `league_tier`,
  credential `status`) still matches the backend schema exactly — these were hand-transcribed in
  step 0, so diff them against the source docs once real Pydantic models exist
- [ ] Re-run the F2–F5 state matrix (loading/empty/error/success/edge-case) against real data —
  a mock rarely reproduces every real error shape, so this is a deliberate pass, not an
  assumption

---

## 5. Backend (deferred — outline only, expand when you get there)

When backend work starts, it follows the phase order and pod structure already locked in the two
source docs: Platform Core + Event Contract first, then Content Engine + Ledger & Integrity in
parallel, then Judge/Lab Engine (highest security bar, most senior pods), then Commerce, then
hardening/anti-cheat maturity. Full detail — tech stack, security gates, testing tiers, DoD — is
already written in `ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md` §2, §8, §9, §10 and
`ZAPSTERS_GAMIFICATION_ENGINE.md` §2, §7, §8, §9, §10. Re-derive this section into its own
`BUILD_BACKEND.md` when that work actually starts, rather than duplicating it here now — a
second copy is a second place for it to drift out of sync with the source docs.
