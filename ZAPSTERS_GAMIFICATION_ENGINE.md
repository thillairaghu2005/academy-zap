# Zapsters — Gamification Engine — Architecture, Tech Stack & SDLC

**Status:** Foundation lock — v1.0 draft
**Audience:** backend engineers, frontend engineers, ML/anti-cheat engineers, product
**Bar:** same discipline as the OX1 and BIM-Vision foundation docs — every decision is written
down **once**. This is a new product surface (a learning platform), but it inherits the org's
existing law: **deterministic math/scoring is never computed by an LLM, every consequential
number is auditable, and raw inputs are never discarded.**

> **The one architectural law of this system:** a user's Rank, XP, and Leaderboard position are
> never mutated directly by a feature. They are **derived, deterministically, from an append-only
> event ledger** by one engine. If a feature wants to award XP, it emits an event. It does not
> touch a score. This is the same "consume the contract, not the side-effect" law as OX1's
> `BuildingContext` / `computed_results` pattern — here it's load-bearing because a rank is a
> **status symbol users will screenshot and put on LinkedIn**, which means it must survive an
> audit, a dispute, and an anti-cheat investigation without anyone re-deriving it by hand.

---

## 1. What we are actually building

A **gamification + integrity layer** that sits beside Zapsters's existing course/assessment
platform (courses, modules, main assessments, side assessments, users) and turns raw learning
activity into: a rank ladder, XP economy, streaks, leagues, guilds, badges, shareable status
artifacts, and — because none of this means anything if it can be gamed — a **verification
system** that makes every number defensible.

**In scope (v1 product surface):**
1. **Rank ladder** (Initiate → Deus, 10 levels, extended below with Prestige).
2. **Dual XP economy** (Completion XP + Mastery XP, weighted separately).
3. **Streaks, freezes, momentum multipliers.**
4. **Seasonal leagues** (promotion/relegation ladder, resets every N weeks).
5. **Guilds/cohorts** with combined XP and guild-vs-guild boards.
6. **Badges & verifiable credentials** (public, cryptographically verifiable, LinkedIn-shareable).
7. **Shareable rank cards** (auto-generated image, "Wrapped"-style).
8. **Skill tree visualization** of course/category progress.
9. **Live combo/multiplier system** during assessments.
10. **Season Pass** (free + premium milestone track).
11. **Anti-cheat / integrity verification system** — the part that makes 1–10 trustworthy.

**Out of scope (v1):** payments/monetization logic for Season Pass (billing is a separate
platform concern), full proctoring (webcam/browser lockdown), native mobile apps (web/PWA first,
same posture as OX1).

**Credibility bar:** a rank, badge, or leaderboard position must survive a support ticket that
says "someone is cheating" — an engineer must be able to answer "show me exactly why user X is
Rank 7" by reading a ledger, not by trusting a cached number.

---

## 2. Foundation decisions (LOCKED — tech stack)

Everything below is **law**, same pinning discipline as `02_TECH_STACK_AND_TOOLS.md`. One
lockfile per side, no per-engineer version choices.

### 2.1 Runtime & languages

| Thing | Version | Pinned in |
|---|---|---|
| Python | **3.12.x** | `.python-version`, `pyproject.toml` |
| Node.js | **22 LTS** | `.nvmrc`, `package.json` engines |
| PostgreSQL | **16.x** (+ TimescaleDB extension for the XP ledger's time-series queries) | `docker-compose.yml` |
| Redis | **7.x** | `docker-compose.yml` |

### 2.2 Backend

| Layer | Library | Version | Purpose |
|---|---|---|---|
| Web framework | **FastAPI** | 0.115.x | All APIs — same platform pattern as OX1 |
| ASGI server | **Uvicorn** + gunicorn (prod) | 0.32.x | Serve FastAPI |
| Validation | **Pydantic** | 2.9.x | Event schemas, ledger entries, module contracts |
| ORM | **SQLAlchemy 2.0 (async)** | 2.0.x | DB access — `AsyncSession` only |
| Migrations | **Alembic** | 1.13.x | Schema versioning, async-aware |
| DB driver | **asyncpg** | pinned | Postgres async driver |
| Cache / real-time state | **Redis** (`redis[hiredis]`) | pinned | Leaderboard sorted sets, streak counters, combo state, rate limiting |
| Event bus | **Redis Streams** (v1) → **Kafka/Redpanda** (only if cross-service fan-out grows past what Streams handles) | pinned | Course/assessment events → Gamification Engine, decoupled from the core LMS |
| Task queue | **Arq** (async, Redis-backed) | pinned | League resets, nightly recompute, badge issuance, share-card generation |
| Auth | **PyJWT** + **pwdlib[argon2]** | pinned | Matches org's FastAPI backend SOP — no `passlib`, no `python-jose` |
| Rate limiting | **fastapi-limiter** | pinned | Assessment submission throttling, anti-farming |
| Hashing / integrity | **`hashlib` (SHA-256)** stdlib | — | Ledger hash-chaining (§7.2) — no external dependency needed |
| Verifiable credentials | **`vc-jwt`** pattern via PyJWT + Ed25519 (`pynacl`) | pinned | Badge signing, matches W3C Verifiable Credentials / Open Badges v3 shape without a heavyweight library |
| Image generation (share cards) | **Pillow** + **Resvg** (SVG→PNG) or a headless **Playwright** render of an HTML template | pinned | Deterministic, server-rendered — never let an LLM "design" the card per-request |
| HTTP client | **httpx** | 0.27.x | Outbound calls (LinkedIn share intents, webhook notifications) |
| AI client | **anthropic** | latest pinned | **Narrative only** — end-of-season recap copy, motivational nudges. Never scores. |
| Structured logging | **structlog** | pinned | Same as `fastapi-backend-sop.md` §10 |

### 2.3 Frontend

| Layer | Library | Version | Purpose |
|---|---|---|---|
| Framework | **Next.js** | 16.2.7+ (App Router, Turbopack) | Per `E2-frontend-SOP.md` — the org standard |
| Language | **TypeScript** | 5.x strict | `noUncheckedIndexedAccess` on |
| UI | **Tailwind v4** + **shadcn/ui** | pinned | Design tokens in `@theme`, shared with the rest of Zapsters's web app |
| Data fetching | **TanStack Query** | 5.x | Leaderboard polling, progress state |
| Real-time | **Server-Sent Events** (v1) for combo counters / live leaderboard ticks → **WebSocket** only if bidirectional push is proven necessary | — | SSE is simpler to scale and secure than WS for a mostly-broadcast use case |
| Animation | **Framer Motion** (`motion`) + Tailwind `tailwindcss-animate` | pinned | Confetti, rank-up transitions, combo meter — the dopamine layer lives here |
| Canvas/share-card preview | **`html-to-image`** (client preview) backed by the server-rendered Pillow/Playwright artifact as the canonical shareable file | pinned | Client shows a live preview; the file that actually gets shared is server-generated and hash-verifiable |
| Charts (skill tree, XP history) | **d3** or **recharts** | pinned | Skill tree is a custom d3 force/tree layout; XP history is a simple recharts line |
| Forms | **react-hook-form** + **zod** | pinned | Matches org standard |

### 2.4 Data & storage

| Store | Purpose |
|---|---|
| **PostgreSQL 16 + TimescaleDB** | `xp_ledger` (append-only, hypertable partitioned by time), users, ranks, guilds, leagues, badges — relational + time-series in one engine |
| **Redis** | Leaderboard sorted sets (`ZADD`/`ZRANGE` — O(log N) rank lookups), live streak counters, combo state during an active assessment session, rate-limit buckets |
| **S3 / MinIO** | Generated share-card images, badge certificate PDFs, verifiable-credential JSON documents |
| **MLflow** (self-hosted, same as OX1) | Anti-cheat model experiment tracking, if/when the anomaly detector graduates past heuristics |

### 2.5 Infra & DevOps (identical posture to OX1 — reuse, don't reinvent)

| Tool | Purpose |
|---|---|
| Docker + docker-compose | Identical stack per engineer |
| `uv` / `pnpm` | Single lockfile per side |
| Gitea + Gitea Actions | Git, PR, CI |
| Nginx Proxy Manager | Reverse proxy, TLS |
| pre-commit (ruff, black, mypy, bandit, gitleaks) | Local + CI enforcement, per `fastapi-backend-sop.md` §4 |
| Sentry | Error tracking (optional tier — wire when a Sentry project exists) |
| Prometheus + Grafana | Leaderboard/queue latency, event-bus lag, ledger-recompute duration |

### 2.6 Do-not-use list

❌ Writing XP/rank directly from an API route — **only** the ledger→engine→projection path may
mutate a score (§4).
❌ Computing rank thresholds, combo multipliers, or streak decay inside a Claude/LLM prompt —
these are named constants in `gamification/rules.py`, same law as OX1's IS-13311 thresholds.
❌ Client-side XP calculation trusted as authoritative — the client may *preview* (e.g. the live
combo meter), but the server always recomputes and the server value wins on any conflict.
❌ Un-hash-chained ledger writes — every `xp_ledger` insert must include the running hash (§7.2);
a migration or hotfix that bypasses this breaks auditability retroactively.
❌ Storing a badge's "verified" status as a boolean flag with no signature — see §7.3, that's a
decorative claim, not a control (same principle as the backend SOP's JWT `jti` denylist rule).
❌ Real-money gambling mechanics (loot boxes with cash value) — cosmetic-only rewards, XP, and
non-monetary streak freezes are fine; anything resembling paid randomized rewards is a legal/ethics
review before it's an engineering ticket.

---

## 3. Architecture — the big picture

```
                    ┌──────────────────────────────────────────────────────┐
  Course/Assessment  │  ZAPSTERS CORE LMS (existing platform)                │
  activity           │  course completion · main assessment submit ·       │
                      │  side assessment submit · login · streak-relevant   │
                      │  activity                                           │
                    └───────────────────────┬──────────────────────────────┘
                                             │ emits domain events (never writes XP itself)
                                             ▼
                    ┌──────────────────────────────────────────────────────┐
                    │  EVENT BUS (Redis Streams)                            │
                    │  course.completed · assessment.submitted ·            │
                    │  side_assessment.submitted · login.recorded           │
                    └───────────────────────┬──────────────────────────────┘
                                             ▼
                    ┌──────────────────────────────────────────────────────┐
                    │  ★ INTEGRITY GATE ★  (Section 7 — runs BEFORE ledger) │
                    │  anti-cheat heuristics · rate/velocity checks ·       │
                    │  device/session fingerprint · confidence score        │
                    └───────────────────────┬──────────────────────────────┘
                          ┌──────────────────┴──────────────────┐
                          ▼ passed                               ▼ flagged
                ┌──────────────────────┐              ┌───────────────────────┐
                │ XP LEDGER (append-   │              │ REVIEW QUEUE           │
                │ only, hash-chained,  │              │ shadow-banned from     │
                │ Postgres/Timescale)  │              │ public boards pending  │
                └──────────┬───────────┘              │ human/automated review │
                           ▼                           └───────────────────────┘
                ┌──────────────────────────────────────────────────────────┐
                │  ★ PROGRESS CONTEXT ENGINE ★  (Section 5 — the whole game) │
                │  aggregate ledger → resolve rank/prestige → streak state → │
                │  league standing → guild rollup → freeze → ProgressContext │
                └───────────────────────┬──────────────────────────────────┘
                     ┌───────────────────┼───────────────────┬───────────────┐
                     ▼                   ▼                   ▼               ▼
           ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌───────────┐
           │ LEADERBOARD      │ │ BADGE/CREDENTIAL │ │ SHARE-CARD       │ │ SEASON/   │
           │ PROJECTION       │ │ ISSUER           │ │ RENDERER         │ │ LEAGUE    │
           │ (Redis sorted    │ │ (signs verifiable│ │ (Pillow/         │ │ SCHEDULER │
           │  sets, read path)│ │  credentials)     │ │  Playwright)     │ │ (Arq cron)│
           └────────┬─────────┘ └────────┬──────────┘ └────────┬─────────┘ └─────┬─────┘
                     ▼                    ▼                     ▼                 ▼
           ┌──────────────────────────────────────────────────────────────────────────┐
           │ FRONTEND: rank ladder · leaderboards · guild boards · skill tree ·         │
           │ combo meter (SSE live) · share-card modal · badge wall · season pass UI    │
           └──────────────────────────────────────────────────────────────────────────┘
```

Everything left of the Progress Context Engine can be re-derived from the ledger at any time.
Everything right of it is a **projection** — cache-like, rebuildable, never a source of truth.
This is what makes "why is this leaderboard wrong" answerable in one place: replay the ledger.

---

## 4. The event contract (what the core LMS emits — the only way in)

The Gamification Engine never reads the LMS's database directly and the LMS never writes to
`xp_ledger` directly. The only coupling is this event schema, versioned like any other contract.

```python
# gamification/events/schema.py

class BaseEvent(BaseModel):
    event_id: UUID
    event_type: str
    schema_version: int
    user_id: UUID
    org_id: UUID | None          # for B2B cohort/company leaderboards
    occurred_at: datetime
    idempotency_key: str          # dedupes retried deliveries — required, not optional
    session_fingerprint: str      # device/session hash, feeds the integrity gate (§7.1)
    payload: dict                 # event-type-specific, validated by a typed subclass below

class CourseCompletedEvent(BaseEvent):
    event_type: Literal["course.completed"] = "course.completed"
    course_id: UUID
    category: str
    time_spent_seconds: int
    completion_pct: float          # must be 100.0 — partial completions never fire this event

class AssessmentSubmittedEvent(BaseEvent):
    event_type: Literal["assessment.submitted"] = "assessment.submitted"
    assessment_id: UUID
    assessment_kind: Literal["main", "side"]
    score_pct: float
    max_score: float
    time_taken_seconds: int
    attempt_number: int
    question_level_answers: list[dict]  # raw, verbatim — never discarded, feeds anti-cheat
```

**Rules:**
- Every event is idempotent by `idempotency_key`; a redelivered event is a no-op, never double XP.
- `question_level_answers` (raw, per-question timing/correctness) is always stored verbatim in a
  `raw_submission_ref` blob before any scoring happens — same "store the raw response" law as
  OX1's `ai_analysis_logs` and BIM-Vision's `Provenance.raw_ref`.
- The LMS side of this contract is a **separate PR-reviewed package** (`gamification/events/`);
  changing it requires updating every producer and consumer in the same PR (SOP §7).

---

## 5. The Progress Context Engine — the file that has to be very good

Mirrors the OX1 Context Engine and BIM-Vision Context Engine pattern exactly: one frozen object,
everything downstream reads it, nothing downstream re-derives it.

### 5.1 What it owns

The only module allowed to:
- Read the `xp_ledger` and turn it into a rank, streak, league, and guild standing.
- Decide when a rank-up, prestige, or league promotion/relegation fires.
- Produce the one object (`ProgressContext`) every projection (leaderboard, badge issuer,
  share-card renderer) consumes.

No projection reads the raw ledger directly. If a projection needs something the context doesn't
expose, that's a schema gap to fix in `ProgressContext`, not a reason to query the ledger directly.

### 5.2 The rank ladder (extended — Prestige added)

| Level | Rank | XP band (illustrative — real thresholds live in `rules.py`, not here) |
|---|---|---|
| 1 | Initiate | 0 – 499 |
| 2 | Oracle | 500 – 1,199 |
| 3 | Spartan | 1,200 – 2,499 |
| 4 | Titan | 2,500 – 4,499 |
| 5 | Atlas | 4,500 – 7,499 |
| 6 | Hyperion | 7,500 – 11,999 |
| 7 | Olympian | 12,000 – 17,999 |
| 8 | Primordial | 18,000 – 25,999 |
| 9 | Ascendant | 26,000 – 35,999 |
| 10 | Deus | 36,000+ |
| **Prestige** | **Deus I / II / III …** | Resets displayed XP to 0 at Deus, keeps a permanent Prestige counter + a unique aura/frame cosmetic per tier — the "rebirth" loop that keeps top 1% engaged instead of capping out |

**Rank is a function of two independently tracked XP tracks, never one blended number:**
- **Completion XP** — courses finished (volume signal).
- **Mastery XP** — main + side assessment performance (quality signal). Side-assessment
  completion applies a **multiplier**, not a flat bonus, to reward engaging with optional depth
  rather than just rushing the required path.
- Displayed rank = resolved from a weighted function of both (weights in `rules.py`), so a
  high-volume/low-mastery user and a low-volume/high-mastery user land at visibly different ranks
  even at similar totals — this is what makes the rank mean something.

### 5.3 The schema (Pydantic, versioned, frozen once computed)

```python
# gamification/context/schema.py

class LedgerEntry(BaseModel):
    id: UUID
    user_id: UUID
    event_id: UUID                      # traces back to the originating event, always
    xp_type: Literal["completion", "mastery", "bonus", "adjustment"]
    xp_delta: int                       # can be negative only for "adjustment" (admin-reviewed correction)
    reason_code: str                    # e.g. "COURSE_COMPLETE", "SIDE_ASSESSMENT_MULTIPLIER"
    multiplier_applied: float
    prev_hash: str                      # hash-chain — see §7.2
    entry_hash: str
    created_at: datetime
    integrity_status: Literal["verified", "flagged", "reversed"]

class StreakState(BaseModel):
    user_id: UUID
    current_streak_days: int
    longest_streak_days: int
    freeze_tokens_available: int
    momentum_multiplier: float          # 1.0 -> 2.0x, derived from current_streak_days
    last_active_date: date
    status: Literal["active", "grace_period", "broken", "frozen"]

class RankState(BaseModel):
    user_id: UUID
    level: int                          # 1-10
    rank_name: str
    prestige_tier: int                  # 0 = no prestige yet
    completion_xp: int
    mastery_xp: int
    percentile_global: float
    percentile_cohort: float | None     # within org/guild, if applicable
    specialization_tag: str | None      # auto-computed from category XP distribution

class LeagueStanding(BaseModel):
    user_id: UUID
    season_id: UUID
    league_tier: Literal["bronze", "silver", "gold", "platinum", "obsidian"]
    rank_in_league: int
    xp_this_season: int
    promotion_zone: bool
    relegation_zone: bool

class GuildRollup(BaseModel):
    guild_id: UUID
    member_count: int
    combined_xp_this_week: int
    guild_rank_global: int

class ProgressContext(BaseModel):
    context_version: int                # increments on every recompute, never mutated in place
    user_id: UUID
    computed_at: datetime
    rank: RankState
    streak: StreakState
    league: LeagueStanding | None
    guild: GuildRollup | None
    unresolved_flags: list[str]         # e.g. "integrity_review_pending" — freeze blocks public display, not XP accrual
    freeze_status: Literal["live", "frozen_pending_review"]
```

### 5.4 The resolution workflow

1. **Ledger read, append-only, nothing mutated.** All `LedgerEntry` rows for a user since the last
   `context_version` are read in order; hash-chain integrity is verified before anything else
   (§7.2) — a broken chain halts computation and pages on-call, it never silently continues.
2. **XP aggregation per track.** Completion XP and Mastery XP are summed independently. Side
   assessment multipliers are applied per-entry at write time (recorded in `multiplier_applied`),
   never recomputed differently at read time — one formula, one place, same law as OX1's velocity
   calc.
3. **Rank resolution.** The weighted rank function (in `gamification/rules.py`, zero ML imports,
   CI-enforced import-linter rule — identical pattern to BIM-Vision's `validators.py`) maps
   (completion_xp, mastery_xp) → level + rank_name. Prestige is resolved separately once Deus is
   reached and the user opts in (rebirth is a deliberate user action, never automatic).
4. **Streak resolution.** Last-active date vs. today, freeze-token consumption if a gap exists and
   a token is available, momentum multiplier recalculated. Streak decay rules are named constants,
   never inferred.
5. **League/guild rollup.** Only recomputed for users in an active season; league standing pulls
   from the current season's ledger slice only (seasons are time-boxed, never all-time).
6. **Integrity flag check.** If any ledger entry since the last computation has
   `integrity_status = flagged`, the whole context is marked `frozen_pending_review` — the user's
   **private** progress still accrues (they aren't blocked from learning), but their **public**
   leaderboard/rank-card visibility freezes until review clears (§7.4). This mirrors BIM-Vision's
   "auto-pass vs. needs-review" gate exactly.
7. **Freeze.** `context_version` increments, old versions are never overwritten — append-only,
   same as OX1's readings table. This is what makes a rank dispute answerable: diff two versions.

### 5.5 File layout

```
gamification/
├── events/
│   └── schema.py           # Section 4 — the contract with the core LMS
├── integrity/
│   ├── gate.py              # Section 7.1 — pre-ledger anti-cheat checks
│   ├── ledger_hash.py        # Section 7.2 — hash-chain write/verify
│   └── credentials.py        # Section 7.3 — verifiable-credential signing
├── context/
│   ├── schema.py             # Section 5.3
│   ├── rank.py                 # step 3 — zero ML imports, CI-enforced
│   ├── streaks.py               # step 4
│   ├── leagues.py                # step 5
│   └── resolver.py                # orchestrates steps 1-7
├── projections/
│   ├── leaderboard.py         # Redis sorted-set read path
│   ├── badges.py                # badge issuance rules + signing
│   ├── share_cards.py            # Pillow/Playwright rendering
│   └── skill_tree.py              # category-XP → tree layout data
├── rules.py                    # ALL named thresholds — multipliers, decay, promotion cutoffs
└── tests/
    └── acceptance/               # frozen fixtures: known ledger -> known ProgressContext
```

---

## 6. Feature modules (mapped to the architecture)

Every feature from the brainstorm slots into one of the projections above, consuming
`ProgressContext` — none of them compute XP themselves.

| Feature | Owning module | Notes |
|---|---|---|
| Rank ladder + Prestige | `context/rank.py` | §5.2 |
| Dual XP (Completion/Mastery) | `context/rank.py` | Weighted, never blended into one input number |
| Specialization tags | `context/rank.py` | Auto-computed from category XP distribution, not self-selected |
| Rank decay / dormant badge dimming | `context/rank.py` + nightly Arq job | Dims a **display** flag only; never deletes XP |
| Streaks + freeze tokens + momentum | `context/streaks.py` | Freeze tokens earned via side-assessment completion — ties an "optional content" incentive to a habit mechanic |
| Daily quest board | `projections/quests.py` (new, small) | Reads `ProgressContext` + a rotating quest template table; rewards are XP ledger entries like anything else |
| Shareable rank cards | `projections/share_cards.py` | Server-rendered, hash-stamped so a shared image is independently verifiable (§7.3) |
| Verifiable badges/credentials | `integrity/credentials.py` + `projections/badges.py` | W3C Verifiable-Credential-shaped JSON, Ed25519-signed, public verify URL |
| Trophy case / cosmetics | `projections/cosmetics.py` (new, small) | Zero XP impact by design — pure status signaling |
| Guilds + guild boards | `context/leagues.py` (guild rollup) + `projections/leaderboard.py` | Combined XP bar computed the same way individual XP is — sum of ledger entries, not a separate system |
| Seasonal leagues (promotion/relegation) | `context/leagues.py` + Arq season scheduler | Season boundaries are hard cutoffs; a new season starts a new league ledger slice, last season's result is frozen and archived |
| Duel mode | `projections/duels.py` (new) | Two users' progress on the *same course* diffed over a shared deadline window — reads two `ProgressContext` snapshots, writes nothing new to the ledger itself |
| Company/cohort leaderboards | `projections/leaderboard.py` | Filtered by `org_id`, same Redis sorted-set mechanism, different key namespace |
| Live combo/multiplier during assessments | Frontend (SSE) + `integrity/gate.py` validates server-side before the multiplier is allowed to affect the final ledger entry | The client shows a *preview* combo meter; the server is the only thing that can turn it into real XP, closing the "client trusted itself" gap |
| Clutch bonus (high-difficulty questions) | `context/rank.py` (mastery XP weighting) | Question difficulty is a static, versioned dataset field — not model-inferred at score time |
| Retry-with-decay | `rules.py` | Named cap-decay curve; enforced at ledger-write time, not at display time |
| Season Pass | `projections/season_pass.py` (new) | Milestone track keyed off `xp_this_season`; premium track gating is a billing-service concern, not a gamification-engine concern — the engine only reports progress |
| Skill tree | `projections/skill_tree.py` | Pure read-projection over category-level Completion XP |
| Anniversary/percentile snapshots | `projections/percentiles.py` (new, small) | Computed nightly (Arq), not per-request — percentile-of-all-users is expensive to compute live |
| Manager/mentor dashboard | `projections/leaderboard.py` (org-scoped view) + RBAC | Read-only, org-scoped, same multi-tenancy law as the rest of Zapsters |
| LinkedIn-verified badge integration | `integrity/credentials.py` | Public verify URL is the actual integration surface — LinkedIn just links to it |
| Peer benchmarking on assessments | `projections/percentiles.py` | "Scored higher than 82% of professionals in [category]" — cohort-filtered percentile |

---

## 7. Verification & Integrity Systems (this is the section that makes any of it trustworthy)

A rank people show off is a rank people will try to fake. This section is not optional polish —
it's why §1–6 are allowed to exist as public status symbols at all.

### 7.1 The Integrity Gate (pre-ledger, every event passes through this)

Runs **before** an event is allowed to become a ledger entry. Heuristic + statistical, not a
black-box ML classifier in v1 — start deterministic, only add a learned model once there's labeled
abuse data to train on (same "strong baseline before custom model" posture as BIM-Vision §5.2).

Checks, each producing a `confidence_score` contribution:
- **Velocity check**: course/assessment completions per unit time vs. a plausible-human ceiling
  (e.g. a course with 40 min of video content completed in 90 seconds is a hard flag).
- **Answer-timing distribution**: `question_level_answers` timing pattern vs. expected reading
  time per question; suspiciously uniform (bot-like) or suspiciously fast-but-all-correct patterns
  flag for review.
- **Session fingerprint reuse**: many distinct `user_id`s submitting from an identical
  `session_fingerprint` in a tight time window (farm detection).
- **Retry-pattern anomaly**: score curves that look like brute-force guessing (many attempts,
  monotonic score climb with no time gap) vs. genuine study-and-retry.
- **Device/network anomaly**: reused device across accounts that share no other relationship
  (guild, org) — a lightweight graph signal, not a hard block.

**Outcome, never silent:**
- `confidence_score` above threshold → event proceeds, `integrity_status = verified`.
- Below threshold → event **still writes to the ledger** (so the user's private progress isn't
  lost or disputed later) but `integrity_status = flagged`, and `ProgressContext` freezes public
  visibility (§5.4 step 6) until a review clears it. **Flagging never silently deletes XP** — a
  false positive must be reversible without data loss, exactly like OX1 never hard-deletes.
- Thresholds live in `rules.py`, named, versioned — never an inline magic number, never an LLM
  judgment call.

### 7.2 Ledger hash-chaining (tamper evidence)

Every `xp_ledger` write includes the SHA-256 hash of the previous entry plus its own payload —
a lightweight, in-house hash chain (not a blockchain, no consensus needed, single writer):

```python
def compute_entry_hash(prev_hash: str, entry: LedgerEntry) -> str:
    payload = f"{prev_hash}|{entry.user_id}|{entry.xp_delta}|{entry.reason_code}|{entry.created_at.isoformat()}"
    return hashlib.sha256(payload.encode()).hexdigest()
```

- The Progress Context Engine **verifies the full chain** (or at minimum the chain segment since
  the last verified checkpoint) before trusting a recompute. A broken link is a P0 incident, not a
  warning — it means either a bug or a direct-DB tamper attempt.
- This is what turns "a user disputes their rank" from a he-said-she-said into "replay the ledger,
  verify the chain, show the exact entries."
- Nightly Arq job independently re-verifies a random sample of chains as a continuous integrity
  check, same spirit as a financial ledger's periodic reconciliation.

### 7.3 Verifiable badges & credentials (the showoff layer has to be real)

A badge is worthless as a status symbol the moment someone learns it can be faked or edited in a
screenshot. So a badge is never *just* an image:

- On issuance, `integrity/credentials.py` produces a **W3C-Verifiable-Credential-shaped JSON
  document** (issuer = Zapsters, subject = user, claim = badge/rank/score, timestamp) and signs it
  with an **Ed25519** key (`pynacl`) held server-side only.
- The document is stored in S3/MinIO and exposed at a **public, permanent verify URL**
  (`zapsters.com/verify/{credential_id}`) that independently re-verifies the signature and renders
  a human-readable confirmation page — this is the actual mechanic behind "click the LinkedIn
  badge and see it's real," same pattern as Credly / Open Badges v3.
- The **shareable rank card image** (§6) has the same `credential_id` embedded as both visible text
  and a QR code, so a screenshot posted anywhere still routes back to a live, re-verifiable source
  — a stale or edited screenshot cannot silently keep working.
- Revocation: if a user's underlying ledger entries are later reversed for integrity reasons, the
  credential's status flips to `revoked` at its stable URL — the verify page always reflects
  current truth, it's not a frozen artifact that can go stale-but-trusted.

### 7.4 Review queue (human-in-the-loop, same posture as BIM-Vision's correction UI)

Flagged events/contexts route to an internal review queue (a small admin panel, RBAC-gated to
`org_admin`/platform-ops):
- Reviewer sees the raw event, the flag reason(s), the confidence score breakdown, and the user's
  recent ledger history.
- Reviewer action is one of: **clear** (unfreezes public visibility, `integrity_status → verified`),
  **reverse** (writes a compensating `adjustment` ledger entry — original entry is never deleted,
  only offset, preserving the append-only law), or **escalate** (account-level restriction, outside
  this engine's scope).
- Every reviewer action is itself an audited, timestamped record — the integrity system has to be
  auditable about auditing, same recursive rigor OX1 applies to its own validation gates.

### 7.5 Deterministic validation gates (CI-enforced, mirrors `bim/context/validators.py`)

`gamification/context/rank.py`, `streaks.py`, `leagues.py` have **zero ML/AI imports** —
CI-enforced via an import-linter rule. If a number affects a rank, a leaderboard position, or a
badge claim, it is computed by named, versioned, testable Python — never a prompt.

The one place an LLM is allowed near this system: **narrative copy** (season recap text,
motivational nudges, "here's what to focus on next" suggestions) — commentary layered on top of
already-computed, already-verified numbers, never the source of a number. Same law as OX1's report
narrative rule and BIM-Vision's compliance rule, restated for a third product line because it's
that important.

---

## 8. SDLC workflow (extends `03_SOPS.md` / `fastapi-backend-sop.md` — does not replace them)

This product follows the org's existing FastAPI backend SOP and Next.js frontend SOP in full
(layered structure, `Annotated[T, Depends(...)]`, Conventional Commits, the local check sequence).
What follows is **gamification-specific** SDLC discipline on top of that baseline.

### 8.1 Branch & commit conventions (inherited, restated for this domain)

```
Branch:   feature/xp-mastery-multiplier
          fix/streak-freeze-off-by-one
          security/ledger-hash-verification

Commit:   feat(context): apply side-assessment multiplier before mastery-xp write
          fix(integrity): correct velocity-check window for course completions
          test(ledger): add hash-chain tamper-detection regression case
```

### 8.2 The gate every gamification PR must clear (in addition to `fastapi-backend-sop.md` §15)

- [ ] **No route/service writes XP or rank directly.** If a diff adds a code path that mutates a
  score outside `gamification/context/` or `gamification/integrity/`, it is rejected regardless of
  how small — this is the one rule with zero exceptions in this doc.
- [ ] **Every new event type is versioned and has a producer + consumer updated in the same PR**
  (§4's "silent contract changes are forbidden," inherited from OX1 SOP §7).
- [ ] **A new rank/streak/league rule is a named constant in `rules.py`**, with a comment citing
  why the number is what it is (even if the answer is "product decision, see ticket #").
- [ ] **Ledger-writing changes ship with a hash-chain regression test** proving tamper detection
  still fires (§7.2) — this is non-negotiable the same way the OX1 calc tests
  (`calculate_upv(300, 75) → 4.0000`) are non-negotiable.
- [ ] **Integrity-gate threshold changes require a second reviewer from outside the immediate
  squad** — a loosened anti-cheat threshold is a security-relevant change even when it looks like
  a UX tweak ("let's not flag people who finish courses fast").
- [ ] **Acceptance test fixtures**: every new feature that reads `ProgressContext` ships a frozen
  fixture (`gamification/tests/acceptance/`) — a known ledger in, a known context out — so a
  future refactor of the resolver can't silently change what a rank means.

### 8.3 Testing tiers (extends `fastapi-backend-sop.md` §12)

| Tier | Scope | Example |
|---|---|---|
| Unit | Pure functions — rank resolution, streak decay, hash computation | `resolve_rank(completion_xp=5000, mastery_xp=3000) == (Level.ATLAS, ...)` |
| Integration | Full event → integrity gate → ledger → context recompute, real throwaway Postgres | Emit a `CourseCompletedEvent`, assert the resulting `ProgressContext` |
| Integrity/security | Anti-cheat heuristics, hash-chain tamper detection, credential signature verification, RBAC on the review queue | Corrupt a mid-chain hash, assert recompute halts and pages, not silently continues |
| Load | Leaderboard read path under concurrent load (Redis sorted-set contention), season-reset job duration at scale | `k6`/`locust` against a seeded 100k-user leaderboard |
| Acceptance | Frozen fixtures per §8.2 | Golden ledger → golden `ProgressContext`, byte-for-byte on the parts that matter (not timestamps) |

Mandatory regression cases (must pass exactly, everywhere touched — same discipline as OX1's
`calculate_upv` table):

```
resolve_rank(completion_xp=0, mastery_xp=0)          → (Level.INITIATE, "Initiate")
resolve_rank(completion_xp=36000, mastery_xp=36000)  → (Level.DEUS, "Deus")
apply_streak_decay(gap_days=1, has_freeze_token=True)  → streak preserved, token consumed
apply_streak_decay(gap_days=1, has_freeze_token=False) → streak broken
verify_ledger_chain(tampered_middle_entry=True)         → raises ChainIntegrityError
credential_verify(valid_signature=True)                  → status="verified"
credential_verify(tampered_payload=True)                  → status="invalid"
```

### 8.4 Definition of Done (gamification-specific addendum to `03_SOPS.md` §6)

A gamification segment is done when, **in addition to** the org's standard DoD:
1. It never writes a score outside the resolver (§8.2, checked in review, not just CI).
2. Its acceptance fixture is frozen and green.
3. If it touches the integrity gate, a second reviewer outside the squad approved.
4. If it's a new public-facing status artifact (badge, share card, leaderboard entry), it links to
   a verify URL and that URL is tested to correctly show `revoked` after a simulated reversal.
5. Task status updated in `docs/BUILD_PLAN.yaml` in the same PR, per org convention.

### 8.5 Release/rollout discipline

- **Season/league changes deploy only between seasons**, never mid-season — changing the
  promotion/relegation formula while a season is live is a fairness violation users will notice
  immediately and loudly.
- **Rank threshold changes** (moving XP bands) require a migration plan for existing users'
  displayed rank — nobody should see their rank silently drop because a threshold moved; existing
  users are grandfathered or explicitly notified, never silently recalculated downward.
- **Feature-flag every new showoff mechanic** (per-org and per-user-cohort) so a new mechanic can
  be dark-launched, verified against real data, then opened up — same posture as OX1's module
  feature flags.

---

## 9. Team structure (pod shape — scale to headcount, same posture as the other foundation docs)

| Pod | Owns | Depends on |
|---|---|---|
| **Event Contract & Core Integration** | The event schema (§4), producer wiring in the core LMS, idempotency guarantees | Core LMS team |
| **Ledger & Integrity** (most senior pod — owns the trust boundary) | `xp_ledger`, hash-chaining, the Integrity Gate, review queue | Event Contract pod |
| **Progress Context Engine** | Rank/streak/league resolution logic, `rules.py`, acceptance fixtures | Ledger & Integrity |
| **Projections & Social Features** | Leaderboards, guilds, share cards, badges, skill tree, duels, season pass | Frozen `ProgressContext` |
| **Verification/Credentials** | Verifiable-credential signing, public verify pages, revocation flow | Ledger & Integrity |
| **Frontend/Gamification UI** | Rank ladder UI, combo meter (SSE), share-card modal, badge wall, season pass UI | Projections |
| **Anti-Cheat R&D** (can start as a shared hat within Ledger & Integrity, split out once volume justifies it) | Heuristic tuning now, learned anomaly model later, using `ai-lab/`-style notebook discipline (never imported into prod directly) | Real usage data |

**Critical path:** Event Contract unblocks everything; Ledger & Integrity is the true bottleneck —
nothing downstream should consume a `ProgressContext` shape that isn't frozen, same "Squad A gate"
pattern as OX1.

---

## 10. Roadmap (phased, same cadence discipline as the org's other foundation docs)

| Phase | Goal | Exit gate |
|---|---|---|
| **0 — Foundation** | Event schema frozen; `xp_ledger` + hash-chain live; Integrity Gate v1 (heuristic-only) running; `ProgressContext` schema frozen; basic rank ladder computes correctly on synthetic events | A synthetic user's event stream goes in → correct frozen `ProgressContext` out, acceptance tests green |
| **1 — Vertical slice** | Rank ladder + dual XP + streaks + one leaderboard (global) + one shareable rank card, end-to-end, real users | One real cohort sees correct live ranks, a generated share card verifies at its public URL |
| **2 — Social layer** | Guilds, seasonal leagues (first full season run), badges/verifiable credentials, skill tree | A full season completes with correct promotion/relegation; a badge issued in week 1 still verifies in week 8 |
| **3 — Depth & retention** | Season Pass, duels, daily quests, combo/multiplier live during assessments, percentile benchmarking, manager dashboards | Retention/DAU lift measured against pre-gamification baseline; anti-cheat flag rate stable and reviewed weekly |
| **4 — Anti-cheat maturity** | Move from pure heuristics to a trained anomaly model (using flagged/reviewed cases as labels), tighter fingerprinting | Model outperforms the heuristic baseline on precision/recall against the reviewed-case dataset before it's trusted to auto-freeze anything |

---

## 11. Evaluation — "done" is a passing acceptance test and a defensible number

| Area | Metric | Bar |
|---|---|---|
| Ledger integrity | % of hash-chain verification runs passing | 100% — any failure is a P0, not a metric to trend |
| Rank correctness | Acceptance fixture pass rate | 100% before any release touching `context/` |
| Integrity gate | False-positive rate on manual review sample | Tracked weekly; trending down as heuristics/model improve, never silently ignored |
| Credential verification | Public verify-URL uptime + correct signature validation | 100% — a badge that can't be verified isn't a badge |
| Leaderboard latency | p99 read latency from Redis projection | Sub-100ms — this is the most-hit read path in the product |
| Season integrity | Promotion/relegation computed identically on recompute vs. live | Byte-identical replay, every season close |
| Engagement (product metric, not integrity) | DAU/streak retention lift, share-card share rate | Track release-over-release; this is the actual business case for the whole system |

---

## 12. What this document deliberately does not lock

Same posture as the org's other foundation docs — open, to be decided as real usage comes in:
- Exact XP-band thresholds per rank level (the table in §5.2 is illustrative; real numbers tune
  against actual course-length/assessment-difficulty distributions).
- Whether the anti-cheat system graduates to a learned model in Phase 4, and what feature set it
  uses — depends entirely on the volume and shape of flagged cases collected in Phases 0–3.
- Season length (2 vs. 4 weeks) and league tier count/names — a product/growth decision, easy to
  change since seasons are already modeled as time-boxed and independently resettable.
- Whether Season Pass premium-track billing integrates via an existing Zapsters billing system or
  needs a new one — explicitly out of this engine's scope either way.
- Native mobile push for streak/combo notifications vs. web-push-only — depends on whether Zapsters
  ships a native app at all (currently PWA-first per the org's mobile posture).
