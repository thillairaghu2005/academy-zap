# Zapsters — Full Platform Architecture, Tech Stack & SDLC

**Status:** Foundation lock — v1.0 draft
**Scope:** the entire consumer/professional learning platform — content delivery (Udemy-shaped),
hands-on code execution (HackerRank-shaped), sandboxed virtual labs (TryHackMe-shaped),
assessments, payments, and the Gamification Engine (`ZAPSTERS_GAMIFICATION_ENGINE.md`) as one
subsystem inside this larger platform, not a separate product.
**Audience:** every engineer on the build, day one.
**Bar:** same discipline as the org's other foundation docs — decided once, written down once,
not re-litigated in chat.

> **The one architectural law of this system:** the platform is **N independent subsystems behind
> one core** — Content, Judge, Labs, Assessments, Gamification, Payments, Search, Notifications —
> each with its own service boundary, its own data store where it needs one, and a fixed contract
> with the core. The core never learns the internals of a subsystem, the same way OX1's platform
> core never learns what "UPV" is. A code-execution sandbox escaping is a Judge-subsystem incident,
> not a platform-wide one, **because the blast radius is architecturally contained, not just
> hoped-for.**

---

## 1. What we are actually building

A single web application, three learning modes, one account/progress system underneath:

1. **Structured courses** (Udemy-shaped): video lessons, articles, quizzes, main + side
   assessments, certificates on completion.
2. **Coding challenges / judge** (HackerRank-shaped): a problem statement, starter code, hidden
   test cases, a multi-language sandboxed execution engine, instant pass/fail + performance
   feedback.
3. **Virtual labs** (TryHackMe-shaped): time-boxed, network-isolated, browser-accessible sandboxed
   environments (a real shell, a real vulnerable/target VM, or a real dev environment) for
   hands-on practice that a video can't teach.
4. **Gamification layer** across all three modes — ranks, XP, streaks, leagues, guilds, badges,
   verifiable credentials (full spec: `ZAPSTERS_GAMIFICATION_ENGINE.md`, referenced not repeated).
5. **Commerce**: course/lab purchases, subscriptions, B2B seat licensing.
6. **Authoring/admin**: course creation, problem/lab authoring, org/B2B management, moderation.

**What we are not building in v1:** a full cloud IDE with arbitrary internet access (labs are
purpose-built, scoped environments, not a general dev-box rental service), live cohort-based
classes/video conferencing (self-paced only for v1), a mobile-native app (PWA first, same posture
as OX1).

**Credibility bar:** a HackerRank-style judge result and a THM-style lab must be **exactly as
trustworthy as the gamification ledger they feed** — a code submission's pass/fail is
deterministic and replayable, a lab's completion is provably real activity, not a guessed
click-through. Everything downstream (XP, rank, certificate) inherits whatever integrity the
judge and lab subsystems provide, so those two subsystems carry the heaviest security bar in the
whole platform.

---

## 2. Foundation decisions (LOCKED — full tech stack)

### 2.1 Runtime & languages

| Thing | Version | Notes |
|---|---|---|
| Python | **3.12.x** | Core platform, Judge orchestrator, Lab orchestrator, Gamification Engine |
| Node.js | **22 LTS** | Frontend only |
| PostgreSQL | **16.x** + TimescaleDB | Relational + the XP ledger time-series (per gamification doc) |
| Redis | **7.x** | Cache, queues, leaderboards, session/lab state |
| Go | **1.23.x** (narrow use) | Only inside the Judge/Lab orchestrator's hot path (container lifecycle control) where Python's overhead matters at high concurrency — everything else stays Python per the org's "one language, one team" law. This is the **one deliberate exception**, scoped to two files, and is itself an ADR. |

### 2.2 Backend — platform core & subsystem services

| Layer | Library | Version | Purpose |
|---|---|---|---|
| Web framework | **FastAPI** | 0.115.x | Every subsystem's API, same platform pattern as OX1 |
| ASGI server | **Uvicorn** + gunicorn | 0.32.x | |
| Validation | **Pydantic** | 2.9.x | Contracts between core and every subsystem |
| ORM | **SQLAlchemy 2.0 async** | 2.0.x | |
| Migrations | **Alembic** | 1.13.x | Per-subsystem migration namespaces (§4.2) |
| Auth | **PyJWT** + **pwdlib[argon2]** | pinned | Per `fastapi-backend-sop.md` |
| Task queue | **Arq** (Redis-backed) | pinned | Judge submission queue, lab provisioning, video transcode jobs, report/certificate generation |
| Event bus | **Redis Streams** (v1) | pinned | Cross-subsystem events — course completion, submission graded, lab session ended, payment succeeded |
| Rate limiting | **fastapi-limiter** | pinned | Especially the Judge submission endpoint — the single most abusable route on the platform |
| Search | **Meilisearch** (self-hosted) | pinned | Course/problem/lab catalog search — instant, typo-tolerant, far lighter to self-host than Elasticsearch, fits the org's budget posture |
| Payments | **Razorpay** (India, primary) + **Stripe** (international) | pinned | Dual-provider from day one given AMITH/Zapsters's India base; never store card data — both are hosted-checkout/tokenized only |
| Email | **Postal** (self-hosted) or **Amazon SES** (if self-hosting mail deliverability becomes a problem) | pinned | Transactional email — receipts, cert issuance, streak-reminder digests |
| Push notifications | **Web Push (VAPID)** via `pywebpush` | pinned | PWA-first, no native push infra needed for v1 |

### 2.3 Content delivery (Udemy-shaped subsystem)

| Layer | Library | Version | Purpose |
|---|---|---|---|
| Video transcoding | **FFmpeg** | pinned | Multi-bitrate HLS packaging on upload, self-hosted, no per-minute SaaS bill |
| Video packaging | **Shaka Packager** | pinned | HLS/DASH manifest generation from FFmpeg output |
| Video player | **video.js** + `videojs-contrib-hls` | pinned | Adaptive bitrate playback, captions, playback-speed, resume-position |
| Storage | **MinIO / S3** | — | Raw uploads + transcoded renditions |
| CDN | **Cloudflare** (free/pro tier) | — | Edge caching for HLS segments and static assets, same cost posture as the org's other budget-conscious infra choices |
| DRM | **None in v1** (signed, short-lived, per-session HLS URLs instead) → **Widevine/FairPlay** only if piracy becomes a measured problem | — | Signed URLs + watermarking (user ID burned into a corner overlay via FFmpeg at serve time) is the pragmatic v1 deterrent; full DRM is expensive and adds real playback friction — don't pay that cost until there's evidence it's needed |
| Authoring | **MDX** for lesson text/articles, custom course-builder UI in Next.js | — | Content is versioned like code — see §4.4 |
| Content moderation | **PaddleOCR** (screenshot text) + deterministic keyword/policy rules for uploaded materials | pinned | Reuses the OCR stack the org already standardized on in the BIM-Vision doc — no need for a second OCR library |

### 2.4 Code Judge Engine (HackerRank-shaped subsystem)

| Layer | Library/Tool | Version | Purpose |
|---|---|---|---|
| Sandboxing | **gVisor** (`runsc`) as the container runtime | pinned | Kernel-level isolation for untrusted code — a syscall-filtering sandbox, not just a namespace/cgroup container, because this endpoint runs **arbitrary user-submitted code** |
| Container orchestration | **Kubernetes** (k3s on the homeserver for dev/staging, managed nodes on Hetzner/cloud for prod burst capacity) | pinned | Ephemeral judge pods, one per submission, destroyed after grading |
| Submission queue | **Redis Streams + Arq workers** | pinned | Decouples "user submits" from "code actually runs" — never execute inline in the request path |
| Language runtimes | Pinned Docker images per language (Python 3.12, Node 22, Java 21, C++/GCC 14, Go 1.23, Rust 1.8x — expand per demand) | pinned per image | Each is a minimal, non-root, network-disabled base image — no image gets general internet access |
| Resource limits | cgroups v2: CPU time, memory, process count, wall-clock timeout, disk I/O caps | — | Enforced per submission, not per language-image default — a language default is not a security control |
| Diffing/grading | Custom `judge/grader.py` — deterministic stdout/stderr/exit-code diff against hidden test cases, optional custom checker script for non-exact-match problems (floating point tolerance, unordered output) | — | Never LLM-graded for pass/fail — same "deterministic math is never AI" law, restated for code correctness |
| Plagiarism detection | **MOSS** (Stanford Measure of Software Similarity, free for academic/educational use) or a self-hosted **JPlag** instance | pinned | Runs async post-submission, flags similarity clusters for review — never auto-fails a submission, feeds the same integrity review queue as the gamification anti-cheat system |

### 2.5 Virtual Lab Engine (TryHackMe-shaped subsystem)

| Layer | Library/Tool | Version | Purpose |
|---|---|---|---|
| Isolation | **Firecracker microVMs** (via **Kata Containers** as the K8s runtime class) | pinned | Labs often need a fuller environment than a judge sandbox (a real filesystem, sometimes multiple networked machines) — microVMs give VM-grade isolation at container-like density |
| Orchestration | **Kubernetes** (shared cluster with the Judge Engine, separate namespace + node pool) | pinned | Per-user ephemeral lab namespace, torn down on session timeout |
| In-browser terminal | **ttyd** (WebSocket-to-TTY bridge) behind the platform's own auth proxy | pinned | No third-party remote-desktop SaaS; ttyd is small, auditable, self-hostable |
| In-browser GUI access (when a lab needs a desktop, not just a shell) | **Apache Guacamole** (RDP/VNC over WebSocket) | pinned | Only provisioned for labs that declare a GUI requirement — not the default, to keep density high |
| Network isolation | Kubernetes **NetworkPolicy** + a dedicated egress-denied namespace per lab session; inter-VM lab traffic (e.g. attacker box → target box) stays on a session-private virtual network | — | A lab environment must never be able to reach the public internet or another user's session — this is the platform's highest-severity failure mode if it breaks |
| Session lifecycle | Arq-scheduled: provision on start → hard timeout (default 60–120 min, configurable per lab) → snapshot-on-pause (optional, premium feature) → destroy | — | Time-boxing is both a cost control and a security control (shorter-lived attack surface) |
| Lab content authoring | Declarative YAML manifest per lab (base image(s), network topology, flag/objective definitions, hint ladder) — same "manifest + code" pattern as OX1's module `manifest.yaml` | — | A lab is a **plug-in**, exactly like an NDT test type or a gamification projection — the orchestrator never hard-codes a specific lab |

### 2.6 Assessment Engine (main + side assessments)

| Layer | Library | Purpose |
|---|---|---|
| Question bank | Versioned, namespaced per course, difficulty-tagged (feeds the gamification "Clutch bonus" static difficulty field) | Postgres, no ML-inferred difficulty at grading time |
| Auto-grading (MCQ/short-answer) | Deterministic exact/fuzzy-match rules in `assessment/grading.py` | Never AI for scoring |
| Auto-grading (code questions) | Delegates to the Judge Engine (§2.4) — an assessment code question **is** a judge submission with a course/assessment context attached | Same engine, one grading truth |
| Anti-cheat during assessments | Tab-visibility change events, paste-event logging, timing telemetry — feeds the same Integrity Gate as the gamification engine (`gamification/integrity/gate.py`) | Reuses the existing gate rather than building a second one |
| Certificates | **WeasyPrint** or the org's existing Puppeteer `pdf-service` container | Server-rendered PDF, hash-stamped, same verify-URL pattern as gamification badges (§7.3 of the gamification doc) |

### 2.7 Frontend

| Layer | Library | Version | Purpose |
|---|---|---|---|
| Framework | **Next.js** | 16.2.7+ App Router | Per `E2-frontend-SOP.md`, the org standard |
| Language | **TypeScript** | 5.x strict | |
| UI | **Tailwind v4** + **shadcn/ui** | pinned | Shared design tokens across Content, Judge, Lab, and Gamification UI |
| Code editor (Judge subsystem) | **Monaco Editor** (the VS Code editor component) | pinned | Syntax highlighting, multi-language, the de facto standard for this exact use case |
| Terminal UI (Lab subsystem) | **xterm.js** | pinned | Pairs with the backend `ttyd` WebSocket bridge |
| Video player | **video.js** | pinned | Per §2.3 |
| Real-time | **SSE** for judge-result polling and gamification combo/leaderboard ticks; **WebSocket** for the lab terminal (bidirectional, required) | — | Use the lighter primitive unless bidirectionality is actually required — the lab terminal is the one place it genuinely is |
| Payments UI | Razorpay/Stripe hosted checkout embeds | pinned | Never build a custom card-number input — that's a PCI-scope decision, not a UX one |
| Forms | **react-hook-form** + **zod** | pinned | |
| Data fetching | **TanStack Query** | 5.x | |

### 2.8 Infra & DevOps

| Tool | Purpose |
|---|---|
| Docker + docker-compose | Local dev — identical stack per engineer |
| **Kubernetes (k3s homeserver → managed cloud prod)** | Orchestrates Judge pods and Lab microVMs — the one place the platform genuinely needs it; the core API/web/DB stay on docker-compose-simple infra, per OX1's "don't over-engineer until scaling demands it" law |
| Gitea + Gitea Actions | Git, PR, CI — same as OX1 |
| Nginx Proxy Manager / Traefik (K8s ingress) | Reverse proxy — Traefik specifically for the K8s-hosted subsystems, NPM for the simpler core |
| `uv` / `pnpm` | Single lockfile per side |
| pre-commit (ruff, black, mypy, bandit, gitleaks) | Per `fastapi-backend-sop.md` §4 |
| Prometheus + Grafana | Latency, queue depth, judge pod lifecycle duration, lab provisioning time |
| Loki | Centralized logs across all subsystems, including judge/lab pod stdout |
| Falco | Runtime security monitoring **inside the Judge/Lab Kubernetes cluster specifically** — detects anomalous syscalls even under gVisor/Kata as defense-in-depth, not a replacement for the sandbox itself |
| MLflow (self-hosted) | Anti-cheat and plagiarism-detection model tracking, once/if those graduate past heuristics |

### 2.9 Do-not-use list (platform-wide, extends the gamification doc's list)

❌ Running user-submitted code with plain Docker + no gVisor/Kata layer — a container alone is not
a security boundary against a determined attacker; this is non-negotiable, not a cost trade-off.
❌ Giving any lab or judge sandbox default internet egress — every network path is explicit
allow-list, default-deny.
❌ Any payment flow that touches raw card numbers on Zapsters's own servers — hosted checkout only,
PCI scope stays with Razorpay/Stripe.
❌ LLM-graded code correctness or LLM-graded assessment scoring — grading is deterministic,
narrative feedback ("here's what to review") may come from Claude, the pass/fail number never does.
❌ A single Kubernetes namespace shared between two users' lab sessions — one namespace per active
session, torn down completely on session end, never reused pre-teardown.
❌ Elasticsearch for v1 search — Meilisearch is lighter to self-host and sufficient at this scale;
revisit only if catalog size or query complexity genuinely outgrows it.
❌ Storing transcoded video with permanent, unsigned public URLs — signed, short-TTL URLs only,
even though DRM itself is deferred (§2.3).

---

## 3. Architecture — the big picture (all subsystems)

```
                                   ┌───────────────────────────────┐
                     Browser/PWA ─▶│  NEXT.JS WEB APP                │
                                   │  course player · code editor ·  │
                                   │  lab terminal · gamification UI │
                                   └───────────────┬─────────────────┘
                                                    ▼
                                   ┌───────────────────────────────────────────┐
                                   │  PLATFORM CORE (FastAPI)                    │
                                   │  auth · RBAC · multi-tenancy · routing ·    │
                                   │  subsystem registry · API gateway           │
                                   └───────┬──────────┬──────────┬──────────┬───┘
                    ┌──────────────────────┘          │          │          └──────────────────────┐
                    ▼                                  ▼          ▼                                 ▼
        ┌───────────────────┐              ┌─────────────────┐ ┌─────────────────┐      ┌───────────────────┐
        │ CONTENT ENGINE     │              │ JUDGE ENGINE      │ │ LAB ENGINE        │      │ ASSESSMENT ENGINE  │
        │ (Udemy-shaped)     │              │ (HackerRank-shaped)│ │ (THM-shaped)       │      │                     │
        │ courses, video,    │              │ submission queue → │ │ session provision → │      │ question bank,      │
        │ articles, catalog  │              │ gVisor sandboxed   │ │ Firecracker/Kata     │      │ auto-grade, delegates│
        │                    │              │ exec → grade       │ │ microVM → ttyd/Guac   │      │ code Qs to Judge     │
        └─────────┬──────────┘              └─────────┬─────────┘ └──────────┬────────────┘      └──────────┬──────────┘
                  │                                    │                      │                               │
                  └───────────────────┬────────────────┴──────────┬───────────┴───────────────┬───────────────┘
                                       ▼                           ▼                            ▼
                              ┌─────────────────────────────────────────────────────────────────────┐
                              │  EVENT BUS (Redis Streams)                                            │
                              │  course.completed · judge.submission_graded · lab.session_completed ·  │
                              │  assessment.submitted · payment.succeeded                              │
                              └───────────────────────────────┬────────────────────────────────────────┘
                                                                ▼
                              ┌─────────────────────────────────────────────────────────────────────┐
                              │  GAMIFICATION ENGINE  (full spec: ZAPSTERS_GAMIFICATION_ENGINE.md)      │
                              │  Integrity Gate → xp_ledger (hash-chained) → ProgressContext →          │
                              │  ranks · streaks · leagues · guilds · badges · share cards               │
                              └───────────────────────────────┬────────────────────────────────────────┘
                                                                ▼
                              ┌─────────────────────────────────────────────────────────────────────┐
                              │  SUPPORTING SUBSYSTEMS: Search (Meilisearch) · Payments (Razorpay/     │
                              │  Stripe) · Notifications (email/push) · Admin/CMS · Certificates        │
                              └─────────────────────────────────────────────────────────────────────┘
```

**Rule:** every subsystem talks to the core through a fixed contract and to every other subsystem
only through the event bus. A subsystem may **not** reach into another subsystem's database. This
is what lets the Judge Engine's Kubernetes cluster be rebuilt, region-migrated, or fully rewritten
in Go someday without anything in Content or Gamification noticing.

---

## 4. The subsystem contract (extends OX1's Module Contract to non-module-plugin subsystems)

### 4.1 Contract interfaces (defined once in `platform/contracts/`)

```python
class ContentProvider(Protocol):
    def get_course(self, course_id: UUID) -> Course: ...
    def get_playback_manifest(self, lesson_id: UUID, user_id: UUID) -> SignedManifest: ...

class JudgeEngine(Protocol):
    def submit(self, submission: CodeSubmission) -> SubmissionAccepted: ...   # queues, returns immediately
    def get_result(self, submission_id: UUID) -> JudgeResult | None: ...       # polled or SSE-pushed

class LabEngine(Protocol):
    def provision_session(self, lab_id: UUID, user_id: UUID) -> LabSession: ...
    def terminate_session(self, session_id: UUID) -> None: ...
    def check_objective(self, session_id: UUID, objective_id: str) -> ObjectiveResult: ...

class AssessmentEngine(Protocol):
    def submit_answer(self, submission: AssessmentSubmission) -> GradeResult: ...

class PaymentProvider(Protocol):
    def create_checkout(self, cart: Cart) -> CheckoutSession: ...
    def verify_webhook(self, raw_payload: bytes, signature: str) -> PaymentEvent: ...
```

Every subsystem implements its slice of this once; the core's registry loop ("for each subsystem,
validate against its contract, register, expose via feature flag") is written once and never
edited when a new course type, lab category, or payment provider is added — identical discipline
to OX1's module registry (`01_ARCHITECTURE.md` §2.2).

### 4.2 Per-subsystem data ownership

| Subsystem | Owns tables/stores | Never touched directly by |
|---|---|---|
| Content Engine | `courses`, `lessons`, `enrollments`, video metadata | Judge, Lab, Gamification |
| Judge Engine | `problems`, `submissions`, `test_cases` (hidden), ephemeral pod state (K8s, not DB) | Content, Lab, Gamification |
| Lab Engine | `labs`, `lab_sessions`, `lab_objectives` | Content, Judge, Gamification |
| Assessment Engine | `assessments`, `questions`, `assessment_submissions` | Everyone except via events |
| Gamification Engine | `xp_ledger`, `rank_state`, `guilds`, `leagues`, `badges` (per its own doc) | Everyone — only reachable via events, per its own architectural law |
| Payments | `orders`, `subscriptions`, `invoices` | Everyone — PCI-relevant, tightest RBAC on the platform |

Each subsystem gets its **own Alembic migration namespace** (`alembic/versions/{subsystem}/`) so
one subsystem's schema changes never produce merge conflicts with another's — same principle as
OX1's `modules/*` isolation, applied to migrations specifically.

### 4.3 Cross-subsystem events (the only coupling)

Same event-bus law as the gamification doc's §4, extended platform-wide:

```python
class JudgeSubmissionGradedEvent(BaseEvent):
    event_type: Literal["judge.submission_graded"] = "judge.submission_graded"
    submission_id: UUID
    problem_id: UUID
    verdict: Literal["accepted", "wrong_answer", "time_limit_exceeded", "runtime_error", "compile_error"]
    runtime_ms: int
    memory_kb: int
    test_cases_passed: int
    test_cases_total: int

class LabSessionCompletedEvent(BaseEvent):
    event_type: Literal["lab.session_completed"] = "lab.session_completed"
    lab_id: UUID
    session_id: UUID
    objectives_completed: list[str]
    time_taken_seconds: int
    hints_used: int
```

These feed the Gamification Engine's event schema exactly like `CourseCompletedEvent` and
`AssessmentSubmittedEvent` already do — a solved judge problem or a completed lab is just another
XP-bearing event, no special-casing in the gamification layer required.

### 4.4 Content versioning (course authoring)

Courses are versioned like code, not edited in place on a live product:
- A course has a `draft` version and a `published` version; enrolled users always see the
  `published` version they enrolled against unless they opt into an update.
- Video/article changes go through the same review discipline as code — an internal
  "course PR" with a preview link before publishing, authored via the CMS but reviewed by a second
  person for anything beyond a typo fix.
- This prevents the single worst LMS failure mode: silently changing graded content underneath a
  user mid-course.

---

## 5. Judge Engine — execution flow (the highest-security-bar subsystem)

```
1. User submits code (language, source, problem_id) → POST /judge/submit
2. Core validates: rate limit check, submission size cap, language allow-list
3. Enqueued to Redis Streams — request returns 202 + submission_id immediately, NEVER executes inline
4. Arq worker picks up the job:
   a. Provisions a fresh gVisor-sandboxed pod from the pinned language image
   b. No network egress, cgroup limits applied (CPU time, memory, process count, wall clock)
   c. Runs against hidden test cases sequentially, capturing stdout/stderr/exit code/timing per case
   d. Pod destroyed immediately after grading — never reused across submissions, even same user
5. grader.py diffs actual vs expected output per test case (exact-match or custom checker)
6. JudgeResult persisted (raw output stored verbatim, same "never discard raw" law)
7. judge.submission_graded event emitted → Gamification Engine, Assessment Engine (if applicable)
8. Async: plagiarism scan (MOSS/JPlag) queued, separate from the grading path — never blocks the
   user's result, flags feed the integrity review queue if similarity crosses a threshold
```

**Why this shape:** steps 3–4 mean a slow or hung submission can never take down the API process
serving everyone else — the queue is the isolation boundary at the request level, gVisor is the
isolation boundary at the execution level, and the destroy-after-use pod policy is the isolation
boundary at the state level. Three independent layers, not one.

---

## 6. Lab Engine — session flow (the highest-blast-radius subsystem)

```
1. User clicks "Start Lab" → POST /labs/{lab_id}/sessions
2. Core checks: concurrent session cap per user (cost control), lab manifest validated
3. Lab Engine provisions:
   a. A dedicated Kubernetes namespace for this session (torn down completely on end)
   b. One or more Firecracker microVMs per the lab's manifest (e.g. "attacker" + "target" boxes)
   c. A session-private virtual network — these VMs can talk to each other, nothing else
   d. Default-deny NetworkPolicy — no path to the public internet, no path to another session
4. Frontend connects: ttyd (shell) or Guacamole (GUI) over an authenticated WebSocket, proxied
   through the core — the user's browser never gets a direct IP to the microVM
5. Objective/flag checks: the lab manifest defines objectives (e.g. "find flag in /root/flag.txt");
   check_objective() runs a scoped read against the session's filesystem/state via the
   orchestrator's control plane, NEVER by trusting a value the user's browser sends
6. Hard timeout fires (default 60-120 min) → session force-terminated, state destroyed
7. lab.session_completed event emitted with objectives_completed, time_taken, hints_used
```

**Why objective-checking never trusts client input:** exactly the same principle as the judge
engine never trusting a client-reported score — the flag/objective check is a server-side read
against the actual sandboxed environment's real state, not a form field the browser submits. This
is the single most common way lab platforms get cheated, and it's closed structurally, not by a
validation rule that could be bypassed.

---

## 7. Platform-wide verification & integrity (extends the gamification doc's §7)

The gamification doc's Integrity Gate, ledger hash-chain, and verifiable credentials cover the
*scoring* layer. This platform adds subsystem-specific integrity controls upstream of that:

| Subsystem | Integrity control | What it prevents |
|---|---|---|
| Judge Engine | gVisor sandbox + default-deny network + resource caps + pod-per-submission | Sandbox escape, resource-exhaustion DoS, submitting code that phones home for the answer |
| Judge Engine | MOSS/JPlag async plagiarism scan | Copy-pasted solutions inflating mastery XP |
| Lab Engine | Server-side-only objective/flag verification | Client-forged completion claims |
| Lab Engine | Falco runtime monitoring inside the cluster | Anomalous syscalls even if a sandbox layer has an undiscovered gap — defense in depth |
| Content Engine | Signed, short-TTL video URLs + burned-in user-ID watermark | Casual redistribution of paid course video |
| Assessment Engine | Tab-visibility + paste-event telemetry feeding the shared Integrity Gate | Answer look-up during a timed assessment |
| Payments | Webhook signature verification on every provider callback, idempotency keys on every charge | Spoofed payment-success events, double-charging on retry |
| Admin/CMS | Every publish/moderation action audit-logged, same append-only law as everywhere else | Undisclosed content tampering, disputed moderation decisions |

All of this ultimately feeds the **same** review queue and the **same** hash-chained ledger
described in the gamification doc — there is one integrity system on this platform, not five, even
though the signals that feed it come from five different subsystems.

---

## 8. SDLC workflow (extends `03_SOPS.md`, `fastapi-backend-sop.md`, and the gamification doc's §8)

### 8.1 What's new at platform scale (beyond the gamification-specific gate)

- [ ] **A PR touching the Judge or Lab Engine's sandbox/network configuration requires a security
  review from outside the squad**, same escalation as the gamification doc's integrity-threshold
  rule — a loosened cgroup limit or an added egress rule is a security-relevant change even if it
  looks like a bug fix ("tests were timing out").
- [ ] **No subsystem PR may add a direct foreign-key or query into another subsystem's tables.**
  Cross-subsystem data needs go through the event bus or a published read-API, never a join across
  schema boundaries (§4.2).
- [ ] **A new language runtime image (Judge Engine) or a new lab manifest (Lab Engine) ships with
  a security checklist**: no default network, correct resource limits declared, no
  privilege-escalation path, reviewed by the security-review rotation before it's enabled for
  real users — an unreviewed image/manifest is not just "not done," it's a blocked deploy.
- [ ] **Content publish actions go through the two-person review described in §4.4** — enforced in
  the CMS itself (a `published` state transition requires a second `reviewer_id`), not just as a
  process note.
- [ ] **Payment-path changes require a staging dry-run against the provider's sandbox/test mode**
  before merge, and the PR description must include the test transaction ID.

### 8.2 Testing tiers (adds to the gamification doc's §8.3)

| Tier | Scope | Example |
|---|---|---|
| Sandbox escape / fuzz | Judge Engine — adversarial submissions (fork bombs, network probes, disk-fill attempts) run in a dedicated test cluster, never prod | Submit a fork bomb, assert the pod is killed by its resource cap and no sibling pod is affected |
| Lab isolation | Lab Engine — cross-session network reachability probes | Attempt to reach Session B's IP from Session A, assert `NetworkPolicy` denies it |
| Load | Judge queue depth under submission bursts (e.g. a popular problem going viral), lab provisioning latency at concurrent-session scale | `k6` against a seeded high-concurrency scenario |
| Payment | Webhook replay, signature-tamper rejection, idempotency-key collision handling | Replay a valid webhook twice, assert only one `payment.succeeded` event and no double-fulfillment |
| Content | Video manifest correctness across bitrate ladders, signed-URL expiry enforcement | Fetch a signed URL after its TTL, assert 403 |

### 8.3 Definition of Done — platform addendum

In addition to the org's standard DoD and the gamification doc's §8.4:
1. Any code touching Judge/Lab sandbox config has the security-review sign-off attached to the PR.
2. Any new subsystem event type has its schema version bumped and every consumer updated in the
   same PR (§4.3, restating the "silent contract changes are forbidden" law for the fourth time in
   this org's docs — it matters that much).
3. Video/content changes went through the two-reviewer publish flow, verifiable in the CMS audit
   log.

---

## 9. Team structure (pods, scale to headcount)

| Pod | Owns | Depends on |
|---|---|---|
| **Platform Core** | Auth, RBAC, subsystem registry, API gateway, event bus | Nobody — Week 1 owner |
| **Content Engine** | Course CRUD, video pipeline, CMS, catalog | Platform Core |
| **Judge Engine** (highest security bar, most senior pod) | Sandbox runtime, submission queue, grading, plagiarism scan | Platform Core |
| **Lab Engine** (co-equal highest security bar) | Kata/Firecracker orchestration, session lifecycle, terminal/GUI bridge, network isolation | Platform Core |
| **Assessment Engine** | Question bank, grading rules, anti-cheat telemetry collection | Platform Core, delegates code questions to Judge Engine |
| **Gamification Engine** | Full scope of `ZAPSTERS_GAMIFICATION_ENGINE.md` | Events from Content/Judge/Lab/Assessment |
| **Commerce & Growth** | Payments, subscriptions, B2B licensing, notifications | Platform Core |
| **Search & Discovery** | Meilisearch indexing pipeline, catalog ranking | Content Engine |
| **Frontend** | Course player, code editor, lab terminal, gamification UI, checkout | Every backend subsystem's published contract |
| **Security/Platform Ops** (cross-cutting, not a feature pod) | Sandbox hardening, Falco rules, security-review rotation for §8.1's mandatory reviews | Reviews everyone, blocked by nobody |

**Critical path:** Platform Core unblocks everyone; Judge Engine and Lab Engine are the true
bottleneck pods — nothing goes to real users through either until its security checklist (§8.1) is
green, the same "Squad A gate" discipline as every other foundation doc in this org, applied here
to the two subsystems where a mistake is a CVE, not a bug ticket.

---

## 10. Roadmap

| Phase | Goal | Exit gate |
|---|---|---|
| **0 — Foundation** | Platform Core + auth live; Content Engine can publish and play a course end-to-end; event bus wired; Gamification Engine's Phase 0 (per its own doc) complete | A synthetic user can register, watch a course, complete it, and see correct XP/rank |
| **1 — Judge vertical slice** | One language (e.g. Python) fully sandboxed, one problem set, submissions grade correctly and feed gamification | A real user submits code, gets a correct verdict, XP updates, no sandbox-escape findings in the fuzz suite |
| **2 — Lab vertical slice** | One lab category live end-to-end (e.g. a single-VM Linux fundamentals lab), terminal access works, objective-checking is server-side-verified | A real user completes a lab, objective check cannot be spoofed from the browser console (verified by a red-team pass) |
| **3 — Commerce + full catalog** | Payments live (both providers), subscriptions, multiple languages in Judge, multiple lab categories, search live | A real purchase → entitlement → content access loop works end-to-end, webhook replay-tested |
| **4 — Hardening & scale** | Load-tested to target concurrency, plagiarism detection live and tuned, anti-cheat model maturity per the gamification doc's Phase 4 | Platform sustains a defined concurrent-user/submission/lab-session target with p99 latency inside budget, zero open critical security findings |

---

## 11. Evaluation

| Area | Metric | Bar |
|---|---|---|
| Judge correctness | Grader agreement with hand-verified expected output | 100% on the acceptance fixture set before any grading-logic change ships |
| Judge security | Fuzz-suite pass rate (no sandbox escape, no resource-cap bypass) | 100% — any failure blocks the release, full stop |
| Lab isolation | Cross-session network reachability probes | Zero successful cross-session reach, every release |
| Video delivery | p95 time-to-first-frame, signed-URL correctness | Sub-2s TTFF on a standard connection profile; 100% of expired URLs correctly rejected |
| Payments | Webhook idempotency correctness, reconciliation match rate vs. provider dashboard | 100% — a payments discrepancy is a P0 |
| Search | Query latency, catalog freshness lag after publish | Sub-50ms p95 query; index reflects a publish within the job's SLA (target: under 1 min) |
| Gamification | Per the gamification doc's own §11 | Unchanged — that doc remains authoritative for its own metrics |

---

## 12. What this document deliberately does not lock

- Exact Kubernetes node-pool sizing and Firecracker vs. plain-gVisor trade-off for lab types that
  turn out not to need full VM isolation (a lightweight lab might downgrade to gVisor-only once
  real usage patterns are known — start at the stricter isolation level, relax only with evidence).
- Whether DRM (Widevine/FairPlay) gets added in a later phase — deferred pending measured piracy
  impact, per §2.3.
- Full language coverage for the Judge Engine beyond the Phase 1 slice — expand by demand.
- Whether Lab sessions ever get a "save/resume" (snapshot) feature — flagged as a possible premium
  feature in §2.5, not committed.
- Live cohort/classroom features (scheduled sessions, video conferencing) — explicitly out of scope
  for the phases above, revisit only as a deliberate new initiative, not a scope-creep addition to
  an existing phase.
