# Zapsters Frontend — Codebase Audit

**Audited:** 2026-08-05 · **Auditor:** Buffy (automated audit — no code was modified) · **Scope:** full repository, working tree state

---

## 1. Executive summary

| Area | Verdict |
|---|---|
| Type safety (`tsc --noEmit`, strict + `noUncheckedIndexedAccess`) | ✅ PASS — 0 errors |
| Lint (`eslint`, next core-web-vitals + TS configs) | ✅ PASS — 0 errors/warnings |
| Production build (`pnpm build`, 29 routes) | ✅ PASS — compiled, 29/29 pages generated |
| Runtime auth boundary (smoke-tested with `pnpm start`) | ✅ PASS — verified below |
| Automated tests | ❌ **NONE — 0 test files in 27k LOC** |
| Dependency security (`pnpm audit --prod`) | ⚠️ 8 vulnerabilities (3 high, 3 moderate, 2 low) — all transitive |
| Git hygiene | ⚠️ 45 modified + 16 untracked files **uncommitted**; mixed line endings |

The codebase is in **good health**: disciplined contract-first architecture, real (mock-server) auth boundary with HMAC-signed HttpOnly cookies, server-owned data rules respected, extensive documentation and an assumption register. The two material gaps are **zero automated tests** and **uncommitted working-tree changes** that include the entire auth/support work. Dependency advisories are real but transitive and low-practical-risk today.

---

## 2. Project profile

- **Stack (locked):** Next.js 16.2.12 (App Router, Turbopack), React 19.2.4, TypeScript strict, Tailwind v4 + shadcn/ui, TanStack Query 5, react-hook-form + zod, Framer Motion, Monaco, xterm.js, video.js, d3.
- **Size:** 178 TS/TSX files · **27,071 LOC** (`app`: 851, `components`: 17,911, `lib`: 8,309).
- **Largest files:** `lib/mocks/gamification.ts` (869), `components/judge/problem-detail-client.tsx` (812), `components/assessments/attempt-client.tsx` (781), `components/gamification/rank-hub-client.tsx` (721), `components/admin/course-form.tsx` (713), `components/lab/session-client.tsx` (690).
- **Routes:** 29 — 23 static (○) + 6 dynamic (ƒ) + 1 proxy (ƒ Proxy). All F0–F7 surfaces + Support add-on shipped.
- **Git:** branch `main` → `origin` (github.com/thillairaghu2005/academy-zap). 5 commits (2026-08-03 → 2026-08-05): `83ffd95` Initial · `17ad9f3` Initial · `9213b14` Fixes · `d6ef2ec` F6 · `92275fd` F7.
- **Runtime env:** Node v26.4.0, pnpm 11.18.0.

---

## 3. Validation results

### 3.1 Typecheck — ✅ PASS
`pnpm typecheck` → `tsc --noEmit`, exit 0. Strict mode with `noUncheckedIndexedAccess` is on and enforced.

### 3.2 Lint — ✅ PASS
`pnpm lint` (eslint 9 + `eslint-config-next` core-web-vitals + typescript), exit 0, no warnings.

### 3.3 Production build — ✅ PASS
`pnpm build` compiled in 3.6s, TypeScript in 4.1s, 29/29 static pages generated. Full route table below.

```
○  /                      ○  /admin/audit           ○  /assessments
ƒ  /admin/courses/[id]/edit  ○  /admin/courses       ○  /courses
ƒ  /api/auth/session      ○  /admin/labs            ƒ  /login
○  /admin/orders          ○  /admin/problems        ○  /rank/badges
○  /admin/support         ƒ  /admin/support/[ticketId]  ○  /support
ƒ  /support/[ticketId]    ○  /support/new           ... (29 total)
```

### 3.4 Runtime smoke test (auth boundary) — ✅ PASS
Started `pnpm start` on :3123 and probed the boundary:

| Request | Result | Expected |
|---|---|---|
| GET `/login` (anon) | `200` | ✅ |
| GET `/courses` (anon) | `307 → /login?next=%2Fcourses` | ✅ redirect with `next` param |
| GET `/api/auth/session` (anon) | `{"status":"anonymous","user":null}` | ✅ |
| POST login (aarav@zapsters.dev) | signed cookie issued | ✅ |
| GET `/courses` (with cookie) | `200` | ✅ |
| GET `/admin` (learner cookie) | `200` (client gate renders "Admins only") | ✅ documented by-design |

### 3.5 Dependency audit — ⚠️ 8 vulnerabilities (all transitive)

| Sev | Package | Issue | Via | Fix |
|---|---|---|---|---|
| **high** | sharp <0.35 | libvips CVEs CVE-2026-33327/8, CVE-2026-35590/1 | `next` (image optimization) | sharp ≥0.35 |
| **high** | postcss ≤8.5.11 | Arbitrary file read via sourceMappingURL (GHSA-6g55-p6wh-862q) | `next` | postcss ≥8.5.12 |
| **high** | postcss ≤8.5.17 | Path-traversal `.map` disclosure (GHSA-r28c-9q8g-f849) | `next` | postcss ≥8.5.18 |
| moderate | postcss <8.5.10 / ≤8.5.22 | XSS via `</style>` / incomplete source-map fixes | `next` | postcss ≥8.5.23 |
| moderate | dompurify ≤3.4.10 | `ALLOWED_ATTR` pollution (GHSA-cmwh-pvxp-8882) | `monaco-editor` | dompurify ≥3.4.11 |
| low | dompurify ≤3.4.11 / <3.4.9 | CUSTOM_ELEMENT_HANDLING / Trusted Types bypass | `monaco-editor` | dompurify ≥3.4.12 |

**Assessment:** all are transitive (bundled with `next` and `monaco-editor`), none are directly imported, and none are reachable in the app's runtime data paths (postcss/sharp are build-time; dompurify ships inside the vendored editor). Practical risk is low, but the advisories should be tracked — the correct remediation is a `next` upgrade once a patched release bundles sharp ≥0.35 / postcss ≥8.5.23, or explicit `pnpm.overrides`.

---

## 4. Architecture review

### 4.1 Strengths (what's done well)

1. **Contract-first discipline** — `lib/contracts/` hand-transcribes the source docs' schemas; enums/literals (verdict, ticket status, league tier) are used verbatim. An **assumption register** in `lib/contracts/index.ts` logs every provisional decision (session schema, F1–F7 extras, support add-on, review workflow) with clear reconciliation notes for the future backend.
2. **Real auth boundary shape** — `lib/server/session.ts` issues HMAC-SHA256-signed, expiring, HttpOnly, SameSite=Lax cookies; `proxy.ts` (Next 16's renamed `middleware.ts`) verifies them on every protected request and redirects to `/login?next=<path>`. Constant-time signature comparison, URL-safe base64. Smoke-tested working.
3. **Server-owned data law respected** — XP/rank/verdicts/ledger are computed only in `lib/api/*` (mock server), never re-derived in components. The mock gamification ledger is a **real SHA-256 hash chain**.
4. **Deterministic mock states everywhere** — every surface exercises loading/empty/error/edge states via reserved fixture keys (`"boom"` → 503, `"missing-course"` → 404, search `"zzzz"` → empty). This makes the later backend swap a data-layer replacement, exactly as build.md intends.
5. **Support add-on quality** — server-side-enforced learner isolation (404 for others' tickets), internal-note stripping on learner reads, a transition state machine with 409s, and audit-logged admin actions. Same standard as the F7 audit log with ledger-linked rows and a reconciliation panel.
6. **Security-conscious defaults** — no committed secrets (scan clean), no `.env` files, `public/vs` (24MB monaco AMD build) and `*.tsbuildinfo` correctly gitignored, `SESSION_SECRET` fallback explicitly flagged, demo scaffolding gated behind `NEXT_PUBLIC_DEMO_MODE`.
7. **Documentation** — build.md, architecture docs, per-file rationale comments, surface registry (`lib/surfaces.ts`), contract README. Exceptionally well-documented for a demo codebase.

### 4.2 Weaknesses & risks (prioritized)

#### 🔴 High — No automated tests
0 test/spec files across 27k LOC (178 files). There is no test runner configured in `package.json` and no CI. The most testable (and most bug-prone) logic — session HMAC verify/expiry, the ticket state machine, the two-person review rule, audit append-only semantics, webhook idempotency, the chained ledger — has zero regression coverage. **Recommendation:** add Vitest; prioritize the `lib/api/support.ts` transition matrix, `lib/server/session.ts`, `lib/api/admin.ts` review workflow, and `lib/mocks/gamification.ts` chain integrity.

#### 🔴 High — Large uncommitted working tree
45 modified files + 16 untracked (~2,100 insertions / 604 deletions) sit uncommitted on `main`. This batch contains the entire product-audit work (auth boundary, F7 extras, support add-on, demo gating). A crash, stray `git checkout`, or another branch working on top of this state risks losing or entangling the work. **Recommendation:** review and commit as a logical unit (or split into auth / F7 / support commits) before further work.

#### 🟠 Medium — Mock API doesn't fully enforce what the UI enforces
`updateCourseShared` in `lib/api/admin.ts` applies any patch to any course regardless of status. The form correctly locks `in_review`/`published` fields, and status *transitions* are enforced with 409s — but a direct API call could edit a published course. For a mock this is acceptable (real CMS enforces server-side), but the `lib/api/admin.ts` header claims "server-side (mock) enforcement" for the workflow; field-edit locking is UI-only. **Recommendation:** add a status guard to `updateCourseShared` for consistency (defense in depth).

#### 🟠 Medium — Line-ending inconsistency / no `.gitattributes`
`lib/mocks/courses.ts` is CRLF while the rest of the tree is LF. Every `git status` emits "LF will be replaced by CRLF" warnings for ~45 files, and `git diff` output is noisy. **Recommendation:** add `.gitattributes` (`* text=auto eol=lf`) and normalize.

#### 🟠 Medium — Doc drift: `middleware.ts` → `proxy.ts`
Next 16 renamed the middleware convention; the file is `proxy.ts`. References to `middleware.ts` remain in `README.md` (line 63), `lib/server/session.ts`, `components/providers/session-provider.tsx`, and `app/login/page.tsx`. Cosmetic, but misleading to future readers. **Recommendation:** update the comments/README.

#### 🟡 Low — Oversized components
Six files exceed 700 lines (up to 812). High cohesion, but they are getting hard to navigate and will be painful to split once the real backend lands. **Recommendation:** decompose opportunistically — e.g., extract the submission-history/verdict panels from `problem-detail-client.tsx`, the combo/timer widgets from `attempt-client.tsx`, the form sections from `course-form.tsx`.

#### 🟡 Low — `(p as any)` in `components/courses/player-client.tsx` (line 214)
The only `any` escape in the tree (video.js `textTracks` access). Harmless, but a typed wrapper would keep the strict-mode claim intact.

#### 🟡 Low — Empty guard block in `setUserRole` (`lib/api/admin.ts`)
The demo-user "stays a learner" guard is an empty `if` with only a comment — silently no-ops. Works, but reads as dead code; a log or early-return would be clearer.

#### 🟡 Low — `lib/api/index.ts` barrel is misleading
Its doc comment lists all subsystem modules, but it only re-exports `./auth`. Components import from `@/lib/api/<subsystem>` directly (fine), so the barrel either should re-export everything or be deleted.

#### 🟡 Low — `SESSION_SECRET` silent fallback
`lib/server/session.ts` falls back to a hardcoded constant when the env var is unset. Documented and flagged, but a deployment that forgets the env var ships with a **known signing secret**. **Recommendation:** `throw`/loud warning when `NODE_ENV === "production"` and the variable is unset.

---

## 5. Security review

| Check | Result |
|---|---|
| Committed secrets / API keys | ✅ none found (grep scan of app/components/lib/proxy) |
| `.env*` files | ✅ none present, gitignored |
| XSS sinks (`dangerouslySetInnerHTML`, `eval`, `new Function`) | ✅ none |
| `@ts-ignore` / `@ts-expect-error` | ✅ none |
| `as any` casts | ⚠️ 1 (`player-client.tsx` video.js `textTracks`) |
| Session cookie | ✅ HttpOnly + SameSite=Lax + 7-day expiry + HMAC-SHA256 + constant-time compare; `Secure` in production |
| Route protection | ✅ proxy gates the `(app)` group; anon → `/login?next=`; verified at runtime |
| Admin RBAC | ⚠️ frontend-only by design (documented in register; real RBAC deferred to backend). Any signed-in learner can load `/admin/*` HTML; the client renders the gate panel. Acceptable for the mock, must be revisited with Platform Core. |
| Auth endpoint hardening | ⚠️ no rate limiting / brute-force protection (mock; fine today, must not ship to prod as-is) |
| Session data | ⚠️ role travels inside the token; only `USER_DIRECTORY` uids resolve on `/api/auth/session`, but `proxy.ts` trusts any validly-signed token. Fine with the secret held; the fallback secret makes this moot in a misconfigured deployment (see 4.2). |
| Dependency advisories | ⚠️ 8 (see §3.5) — all transitive |

---

## 6. Repo hygiene

- **`.gitignore`** — solid: `node_modules`, `.next`, `public/vs` (regenerated by `scripts/sync-monaco.mjs` on postinstall/predev/prebuild), `*.tsbuildinfo`, `.env*`.
- **`tsconfig.tsbuildinfo`** present on disk but correctly ignored.
- **No `.gitattributes`** — line-ending warnings on every status (see 4.2).
- **No CI workflow** — no `.github/` dir despite an existing remote. **Recommendation:** a GitHub Actions job running `pnpm install && pnpm lint && pnpm typecheck && pnpm build` (+ `pnpm audit --prod` once advisories are resolved) on push/PR.
- **Uncommitted work** — 45 M + 16 untracked (see 4.2). Untracked includes: `app/api/` (auth route), `app/(app)/support/*`, `app/(app)/admin/support/*`, `components/support/*`, `components/admin/{admin-walkthrough,course-review-diff,ledger-entry-detail,reconciliation-panel,support-queue-client,support-ticket-detail}.tsx`, `lib/server/`, `lib/api/support.ts`, `lib/contracts/support.ts`, `lib/mocks/{support,walkthrough}.ts`, `proxy.ts`.

---

## 7. Findings register (quick reference)

| # | Severity | Finding | Where |
|---|---|---|---|
| 1 | 🔴 High | No automated tests / no CI | repo-wide |
| 2 | 🔴 High | 45 M + 16 untracked files uncommitted | git |
| 3 | 🟠 Med | 8 transitive dep advisories (3 high) | `pnpm audit` |
| 4 | 🟠 Med | Mock API allows edits to in-review/published courses (UI-only lock) | `lib/api/admin.ts` |
| 5 | 🟠 Med | CRLF in `lib/mocks/courses.ts`; no `.gitattributes` | repo |
| 6 | 🟠 Med | Doc drift: `middleware.ts` vs `proxy.ts` | README, comments |
| 7 | 🟡 Low | 6 components >700 LOC | components |
| 8 | 🟡 Low | One `as any` cast | `player-client.tsx:214` |
| 9 | 🟡 Low | Empty no-op guard block | `lib/api/admin.ts` `setUserRole` |
| 10 | 🟡 Low | `lib/api/index.ts` barrel incomplete/misleading | `lib/api/index.ts` |
| 11 | 🟡 Low | `SESSION_SECRET` silent fallback in production | `lib/server/session.ts` |
| 12 | ⚠️ Info | Admin RBAC frontend-only (documented by-design) | session-provider, register |

---

## 8. Recommended action plan

1. **Commit the working tree** (auth boundary, F7 extras, support add-on) — ideally 2–3 logical commits.
2. **Add tests** — Vitest for `lib/server/session.ts` (sign/verify/expiry/tamper), `lib/api/support.ts` (transition matrix, learner isolation, internal-note stripping, 409s), `lib/api/admin.ts` (two-person rule, publish/unpublish transitions, audit append-only), `lib/mocks/gamification.ts` (chain integrity). Wire `lint+typecheck+build+test` into CI (GitHub Actions).
3. **Track dep advisories** — watch for a `next` release bundling sharp ≥0.35 / postcss ≥8.5.23; then `pnpm up next monaco-editor` and re-audit.
4. **Add `.gitattributes`** (`* text=auto eol=lf`) and normalize line endings.
5. **Fix doc drift** — `middleware.ts` → `proxy.ts` in README + comments.
6. **Harden the mock** — status guard in `updateCourseShared`; loud failure (throw) instead of silent `SESSION_SECRET` fallback when `NODE_ENV=production`.
7. **Optional cleanups** — decompose the 700+ LOC components; delete or complete `lib/api/index.ts`; type the video.js `textTracks` access; make the `setUserRole` demo guard explicit.

---

## 9. Methodology

- Read configs (`package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `components.json`, `.gitignore`), source docs (`build.md`, architecture/gamification docs), and the full contract/mock/API/server layers.
- Ran `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm audit --prod`.
- Runtime smoke test of the auth boundary against `pnpm start` (redirect, session cookie, admin gate).
- Grep scans for TODO/FIXME, console statements, `any`/`@ts-ignore`, XSS sinks, secrets, env files, test files.
- Reviewed git history, working-tree diffstat, line-ending consistency, and untracked files.
- **No source files were modified.**
