# Audit Baseline — 2026-09-09

## Commit

```
SHA: 5de3544013630fdf81f419e61d47abb3d89e6007
Branch: chore/dead-code-audit (branched from main)
```

## Working tree

Clean before branching. One README.md modification stashed as
`audit-prep: stash README.md changes`.

## Typecheck (pnpm typecheck)

Exit code: **0** — zero errors.

## Lint (pnpm lint)

Exit code: **1** — 60 pre-existing errors (all `@typescript-eslint/no-unused-vars`
and one `react-hooks/set-state-in-effect` in `components/ui/carousel.tsx`).
This is the pre-existing baseline; the audit will reduce this count.

## Tests (pnpm test)

Exit code: **0**

| Metric | Value |
|--------|-------|
| Test files | 16 |
| Tests passed | 107 |
| Tests failed | 0 |
| Duration | ~11.8 s |

## File counts

| Category | Count |
|----------|-------|
| Source files (.ts, .tsx, .js, .jsx, .py, .css) — excl. node_modules, .next, .git, .venv, mocks | 825 |
| App route files (*.ts, *.tsx under app/) | 80 |
| Component files (*.ts, *.tsx under components/) | 130 |
| Lib files (*.ts, *.tsx under lib/, excl. mocks) | 82 |
| Backend Python files (excl. .venv, alembic) | ~110 |

## Dependencies

| Category | Count |
|----------|-------|
| Production dependencies (package.json) | 46 |
| Dev dependencies (package.json) | 11 |

## Pre-existing lint errors by file (60 total)

```
app/(marketing)/faq/page.tsx                          3 errors
components/courses/course-detail-client.tsx           6 errors
components/courses/marketplace/course-card.tsx        7 errors
components/courses/marketplace/marketplace-client.tsx 1 error
components/dashboard/dashboard.tsx                    1 error
components/dashboard/learning-insights.tsx            3 errors
components/dashboard/my-learning.tsx                  3 errors
components/judge/problem-list-client.tsx              1 error
components/landing/category-card.tsx                  4 errors
components/landing/featured-course-card.tsx           1 error
components/landing/hero-section.tsx                   2 errors
components/landing/landing-page.tsx                   10 errors
components/landing/marketing-nav.tsx                  1 error
components/landing/premium-sections.tsx               2 errors
components/layout/demo-mode-badge.tsx                 1 error
components/ui/ambient-section.tsx                     5 errors
components/ui/carousel.tsx                            1 error (react-hooks)
components/ui/glow-orb.tsx                            5 errors
components/ui/section-shell.tsx                       2 errors
```
