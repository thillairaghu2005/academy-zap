# Reachability Map

Compiled 2026-09-09. Every deletion decision in Phase 4 is checked against
this file before marking anything SAFE.

---

## 1. Real entry points

### Next.js App Router (all reachable by filename convention)

| Path | Convention |
|------|-----------|
| `app/layout.tsx` | Root layout |
| `app/template.tsx` | Root template |
| `app/error.tsx` | Root error boundary |
| `app/global-error.tsx` | Global error boundary |
| `app/not-found.tsx` | 404 page |
| `app/robots.ts` | `GET /robots.txt` |
| `app/sitemap.ts` | `GET /sitemap.xml` |
| `app/opengraph-image.tsx` | OG image |
| `app/twitter-image.tsx` | Twitter card |
| `app/fonts.ts` | Imported by layout |
| `app/globals.css` | Imported by layout |
| `app/(marketing)/page.tsx` | Home `/` |
| `app/(marketing)/faq/page.tsx` | `/faq` |
| `app/(marketing)/layout.tsx` | Marketing layout |
| `app/(marketing)/loading.tsx` | Marketing loading |
| `app/login/page.tsx` | `/login` |
| `app/login/loading.tsx` | Login loading |
| `app/register/page.tsx` | `/register` |
| `app/register/loading.tsx` | Register loading |
| `app/pricing/page.tsx` | `/pricing` |
| `app/pricing/loading.tsx` | Pricing loading |
| `app/thank-you/page.tsx` | `/thank-you` |
| `app/thank-you/loading.tsx` | Thank-you loading |
| `app/thank-you/thank-you-client.tsx` | Used by page |
| `app/legal/privacy/page.tsx` | `/legal/privacy` |
| `app/legal/terms/page.tsx` | `/legal/terms` |
| `app/offline/page.tsx` | `/offline` |
| `app/offline/course/[courseId]/page.tsx` | Offline course reader |
| `app/(app)/layout.tsx` | App layout |
| `app/(app)/loading.tsx` | App loading |
| `app/(app)/dashboard/page.tsx` | `/dashboard` |
| `app/(app)/courses/page.tsx` | `/courses` |
| `app/(app)/courses/loading.tsx` | Courses loading |
| `app/(app)/courses/[id]/page.tsx` | Course detail |
| `app/(app)/courses/[id]/loading.tsx` | Course loading |
| `app/(app)/courses/[id]/learn/page.tsx` | Course player |
| `app/(app)/judge/page.tsx` | `/judge` |
| `app/(app)/judge/loading.tsx` | Judge loading |
| `app/(app)/judge/[id]/page.tsx` | Problem detail |
| `app/(app)/judge/[id]/loading.tsx` | Problem loading |
| `app/(app)/labs/page.tsx` | `/labs` |
| `app/(app)/labs/loading.tsx` | Labs loading |
| `app/(app)/labs/[id]/page.tsx` | Lab detail |
| `app/(app)/labs/[id]/loading.tsx` | Lab loading |
| `app/(app)/labs/[id]/notebook/page.tsx` | Lab notebook |
| `app/(app)/labs/[id]/session/[sessionId]/page.tsx` | Lab session |
| `app/(app)/labs/[id]/session/[sessionId]/loading.tsx` | Session loading |
| `app/(app)/assessments/page.tsx` | `/assessments` |
| `app/(app)/assessments/[id]/page.tsx` | Assessment detail |
| `app/(app)/assessments/[id]/attempt/[attemptId]/page.tsx` | Attempt |
| `app/(app)/admin/page.tsx` | Admin home |
| `app/(app)/admin/layout.tsx` | Admin layout |
| `app/(app)/admin/analytics/page.tsx` | Admin analytics |
| `app/(app)/admin/audit/page.tsx` | Admin audit |
| `app/(app)/admin/courses/page.tsx` | Admin courses |
| `app/(app)/admin/courses/new/page.tsx` | New course |
| `app/(app)/admin/courses/[courseId]/edit/page.tsx` | Edit course |
| `app/(app)/admin/labs/page.tsx` | Admin labs |
| `app/(app)/admin/orders/page.tsx` | Admin orders |
| `app/(app)/admin/problems/page.tsx` | Admin problems |
| `app/(app)/admin/reviews/page.tsx` | Admin reviews |
| `app/(app)/admin/support/page.tsx` | Admin support |
| `app/(app)/admin/support/[ticketId]/page.tsx` | Admin ticket |
| `app/(app)/admin/users/page.tsx` | Admin users |
| `app/(app)/rank/page.tsx` | Rank page |
| `app/(app)/rank/badges/page.tsx` | Badges |
| `app/(app)/rank/verify/[credentialId]/page.tsx` | Credential verify |
| `app/(app)/profile/page.tsx` | Profile |
| `app/(app)/cart/page.tsx` | Cart |
| `app/(app)/checkout/page.tsx` | Checkout |
| `app/(app)/checkout/billing/page.tsx` | Billing |
| `app/(app)/checkout/[checkoutId]/page.tsx` | Checkout item |
| `app/(app)/support/page.tsx` | Support |
| `app/(app)/support/new/page.tsx` | New ticket |
| `app/(app)/support/[ticketId]/page.tsx` | Ticket thread |
| `app/(app)/guilds/page.tsx` | Guilds |
| `app/(app)/leaderboards/page.tsx` | Leaderboards |
| `app/(app)/saved/page.tsx` | Saved |
| `app/(app)/mentors/page.tsx` | Mentors |
| `app/(app)/mentors/[id]/page.tsx` | Mentor detail |
| `app/(app)/mentors/loading.tsx` | Mentors loading |
| `app/api/backend/[...path]/route.ts` | Proxy API route |

### Next.js middleware

`lib/middleware.ts` is referenced by `middleware.ts` (root if it exists)
or directly consumed by Next.js. **Keep**.

### Backend (FastAPI, Python)

`backend/main.py` — FastAPI app entrypoint (not linted by frontend ESLint).
All Python files in `backend/` are out of ESLint scope.

---

## 2. Framework conventions (never imported, reachable by name)

- `app/*/page.tsx`, `app/*/layout.tsx`, `app/*/loading.tsx`, `app/*/error.tsx` — Next.js file-system routing
- `app/robots.ts`, `app/sitemap.ts` — Next.js special routes
- `app/opengraph-image.tsx`, `app/twitter-image.tsx` — Next.js image routes
- `app/fonts.ts` — loaded by `app/layout.tsx` (imported, not a convention)
- `scripts/sync-monaco.mjs` — invoked by npm `postinstall`, `predev`, `prebuild` scripts in `package.json`
- `vitest.config.ts` — vitest test runner config
- `postcss.config.mjs` — PostCSS plugin config (Tailwind)
- `eslint.config.mjs` — ESLint config
- `next.config.ts` — Next.js config
- `pnpm-workspace.yaml` — pnpm workspace config

---

## 3. Dynamically loaded / convention-wired code

- `lib/middleware.ts` — Supabase SSR session management, consumed by Next.js middleware
- `lib/analytics.ts` — exported functions used at runtime across components
- `components/providers/**` — all wired into layout trees, never statically referenced at root
- `lib/demo/**` — IndexedDB-backed demo state, called via function references
- `lib/offline/**` — Service worker cache helpers
- Service worker: referenced by `components/providers/service-worker-provider.tsx`

---

## 4. Public surface / cross-package exports

This is a private Next.js application (not a published package). No monorepo siblings. `package.json` has `"private": true` and no `exports` field. No cross-package surface to protect.

---

## 5. Config-referenced code

| File | Referenced from |
|------|----------------|
| `scripts/sync-monaco.mjs` | `package.json` scripts |
| `public/vs/**` | ESLint ignore (`eslint.config.mjs`); synced by `scripts/sync-monaco.mjs` |
| `src/styles/typography.css` | `app/globals.css` line 4 |
| `src/assets/images/**` | Imported by various components; `opengraph-image.tsx` uses `path.join` |
| `src/assets.d.ts` | TypeScript ambient module declaration for `*.png` imports — picked up by tsconfig's `include: ["**/*.ts"]` |

---

## 6. Test infrastructure

| File | Notes |
|------|-------|
| `vitest.config.ts` | Test runner config |
| `lib/**/*.test.ts` | Test files co-located with source |
| `lib/mocks/**` | Out of scope per §0 |
| `backend/tests/**` | Backend test suite |

---

## 7. Do-not-touch list

In addition to the global do-not-delete rules in §6 of the prompt:

- `audit/` — self-referential audit artifacts
- `lib/mocks/**` — explicitly out of scope
- `backend/alembic/**` — DB migrations, never delete
- `backend/.venv/**` — virtualenv, out of scope
- `.github/**` — CI/CD workflows
- All `*.test.ts` files — test files
