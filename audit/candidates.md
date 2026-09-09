# Dead-Code Candidates

Compiled 2026-09-09. Sources: ESLint `@typescript-eslint/no-unused-vars`,
repo-wide `rg` cross-check, manual JSX inspection.

Legend: **SAFE** = delete this pass | **KEEP** = false positive | **REVIEW** = needs human

---

## Candidate Inventory

| # | Path / Symbol | Category | Tool(s) | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | `app/(marketing)/faq/page.tsx` — `import { ChevronDown }` | unused-import | ESLint | **SAFE** | Not rendered anywhere in the file |
| 2 | `app/(marketing)/faq/page.tsx` — `import { JsonLd }` | unused-import | ESLint | **SAFE** | `jsonLd` object built but `<JsonLd>` never rendered |
| 3 | `app/(marketing)/faq/page.tsx` — `const jsonLd = {...}` | unused-var | ESLint | **SAFE** | Built but never passed anywhere |
| 4 | `components/courses/course-detail-client.tsx` — `import { GraduationCap }` | unused-import | ESLint | **SAFE** | Not in JSX |
| 5 | `components/courses/course-detail-client.tsx` — `import { hueForId }` | unused-import | ESLint | **SAFE** | `coverGradient()` calls `void hue` (ignores it); `hueForId` not passed |
| 6 | `components/courses/course-detail-client.tsx` — `import { Card, CardContent, CardHeader }` | unused-import | ESLint | **SAFE** | Not in JSX |
| 7 | `components/courses/course-detail-client.tsx` — `function coverGradient` | unused-var | ESLint | **SAFE** | Defined locally but never called in this file |
| 8 | `components/courses/marketplace/course-card.tsx` — `import { Clock3, PlayCircle, ShoppingCart, Star, Zap }` | unused-import | ESLint | **SAFE** | 5 lucide icons not in JSX |
| 9 | `components/courses/marketplace/course-card.tsx` — `import { CourseThumbnail }` | unused-import | ESLint | **SAFE** | Not in JSX |
| 10 | `components/courses/marketplace/course-card.tsx` — `import { Badge }` | unused-import | ESLint | **SAFE** | Not in JSX |
| 11 | `components/courses/marketplace/marketplace-client.tsx` — `const HERO_COVER_IDS` | unused-var | ESLint | **SAFE** | Defined with comment "Flagship covers…" but never used |
| 12 | `components/dashboard/dashboard.tsx` — `import { Gauge }` | unused-import | ESLint | **SAFE** | Not in JSX |
| 13 | `components/dashboard/learning-insights.tsx` — `import { BookOpen }` | unused-import | ESLint | **SAFE** | Not in JSX |
| 14 | `components/dashboard/learning-insights.tsx` — `import { searchCatalog }` | unused-import | ESLint | **SAFE** | Imported but never called in this file; used elsewhere |
| 15 | `components/dashboard/learning-insights.tsx` — `{ items }` param | unused-var | ESLint | **KEEP** | The prop is part of the public component API; renaming to `_items` would be a behaviour-neutral fix but is a code change. The param exists to receive data from the parent. REVIEW below. |
| 16 | `components/dashboard/my-learning.tsx` — `function LearningCard` | unused-var | ESLint | **SAFE** | Defined locally, never called; `LearningJourney` uses its own rendering |
| 17 | `components/dashboard/my-learning.tsx` — `const activeCount` | unused-var | ESLint | **SAFE** | Computed but never used in JSX |
| 18 | `components/dashboard/my-learning.tsx` — `const secondary` | unused-var | ESLint | **SAFE** | Destructured but never referenced after assignment |
| 19 | `components/judge/problem-list-client.tsx` — `function PathCard` | unused-var | ESLint | **SAFE** | Defined locally, never called |
| 20 | `components/landing/category-card.tsx` — `import { ArrowUpRight }` | unused-import | ESLint | **SAFE** | Not in JSX |
| 21 | `components/landing/category-card.tsx` — `import { cn }` | unused-import | ESLint | **SAFE** | Not called |
| 22 | `components/landing/category-card.tsx` — `{ icon: Icon, tone }` params | unused-var | ESLint | **KEEP** | `Icon` and `tone` are part of the public `CategoryCardProps` interface; the interface is correct but the implementation is simplified. The props can't be deleted without breaking callers. The fix is to either use them or prefix with `_`. REVIEW below. |
| 23 | `components/landing/featured-course-card.tsx` — `{ index }` param | unused-var | ESLint | **KEEP** | Part of `FeaturedCourseCardProps`; callers pass it. Caller can't be changed without a separate PR. REVIEW. |
| 24 | `components/landing/hero-section.tsx` — `import { GlowOrb }` | unused-import | ESLint | **SAFE** | Imported, not in JSX |
| 25 | `components/landing/hero-section.tsx` — `import { NoiseOverlay }` | unused-import | ESLint | **SAFE** | Imported, not in JSX |
| 26 | `components/landing/landing-page.tsx` — `import { Atom, Braces, CloudCog, GlobeLock, Network, Radar }` | unused-import | ESLint | **SAFE** | 6 lucide icons not in JSX |
| 27 | `components/landing/landing-page.tsx` — `import { SectionTitle }` | unused-import | ESLint | **SAFE** | `SectionTitle` imported but not used in this file; used in `conversion-sections.tsx` |
| 28 | `components/landing/landing-page.tsx` — `import { SocialProof }` | unused-import | ESLint | **SAFE** | `SocialProof` imported but not used in JSX; not used anywhere else either (REVIEW below) |
| 29 | `components/landing/landing-page.tsx` — `import { Marquee }` | unused-import | ESLint | **SAFE** | Used in `conversion-sections.tsx`, not here |
| 30 | `components/landing/landing-page.tsx` — `import { LiveLearningTicker }` | unused-import | ESLint | **SAFE** | Not in JSX; no other importer |
| 31 | `components/landing/landing-page.tsx` — `import { MarketingProofBar }` | unused-import | ESLint | **SAFE** | Not in JSX; no other importer |
| 32 | `components/landing/marketing-nav.tsx` — `import { RankXpChip }` | unused-import | ESLint | **SAFE** | Imported but not in JSX; used in `top-nav.tsx` but not here |
| 33 | `components/landing/premium-sections.tsx` — `const planInterval` | unused-var | ESLint | **SAFE** | Computed but used only in a template string that has a literal `${planInterval}` (bug: the template uses single-quote string, not template literal, so the variable is dead) |
| 34 | `components/landing/premium-sections.tsx` — `const destination` | unused-var | ESLint | **SAFE** | Computed but `href` never uses it (href uses `plan.name` directly) |
| 35 | `components/layout/demo-mode-badge.tsx` — `import { Info }` | unused-import | ESLint | **SAFE** | Component returns null; `Info` not used |
| 36 | `components/ui/ambient-section.tsx` — `import { AuroraBackdrop }` | unused-import | ESLint | **SAFE** | Removed background elements per comment "removed for flat UI" |
| 37 | `components/ui/ambient-section.tsx` — `import { GlowOrb }` | unused-import | ESLint | **SAFE** | Same reason |
| 38 | `components/ui/ambient-section.tsx` — `import { NoiseOverlay }` | unused-import | ESLint | **SAFE** | Same reason |
| 39 | `components/ui/ambient-section.tsx` — `tone, orb` params (destructured not used) | unused-var | ESLint | **KEEP** | Part of public API; callers pass these. REVIEW below. |
| 40 | `components/ui/glow-orb.tsx` — `import { cn }` | unused-import | ESLint | **SAFE** | Component returns null |
| 41 | `components/ui/glow-orb.tsx` — `{ className, size, style, ...props }` | unused-var | ESLint | **SAFE** | Component returns null; all params unused |
| 42 | `components/ui/section-shell.tsx` — `import { AuroraBackdrop }` | unused-import | ESLint | **SAFE** | Comment says "ambient backdrop removed for flat UI" |
| 43 | `components/ui/section-shell.tsx` — `ambient` param | unused-var | ESLint | **KEEP** | Part of `SectionShellProps` public API. REVIEW. |
| 44 | `components/ui/carousel.tsx` line 98 | react-hooks/set-state-in-effect | ESLint | **KEEP** | This is a pre-existing shadcn/ui carousel pattern; the `onSelect(api)` call sets up initial state. Do not touch — changing it would alter behaviour. |

---

## REVIEW List (needs human answer)

| # | Item | Question |
|---|---|---|
| R1 | `components/dashboard/learning-insights.tsx` — `{ items }` param | Should `items` be removed from the component signature, or is the parent expected to pass it in the future? Currently `LearningInsights` ignores the prop entirely. |
| R2 | `components/landing/category-card.tsx` — `{ icon: Icon, tone }` params | These are in the public `CategoryCardProps` interface but not rendered. Is the component intentionally simplified, or should these be prefixed `_icon` and `_tone`? |
| R3 | `components/landing/featured-course-card.tsx` — `{ index }` param | `index` is part of `FeaturedCourseCardProps` and passed by callers but never used. Prefix `_index`? |
| R4 | `components/ui/section-shell.tsx` — `ambient` param | `ambient` is destructured but not used. Is this a future-flag that should stay? |
| R5 | `components/ui/ambient-section.tsx` — `tone, orb` params | `tone` and `orb` are destructured but not rendered. Callers pass them. Prefix `_tone, _orb`? |
| R6 | `components/landing/social-proof.tsx` — entire file | `SocialProof` component is imported in `landing-page.tsx` but never rendered. No other importer. Is it safe to remove the import and retire the component? |
| R7 | `components/landing/landing-page.tsx` — `LiveLearningTicker`, `MarketingProofBar` | Both are exported from `premium-sections.tsx` and imported (but unused) here. They exist in the barrel for future use. Safe to remove the imports from `landing-page.tsx`? The exports remain in `premium-sections.tsx`. |

---

## KEEP List (false positives)

| # | Item | Reason |
|---|---|---|
| K1 | `lib/visual.ts — hueForId` | Used by many files; ESLint flagged the import in `course-detail-client.tsx` only because `coverGradient` uses `void hue` |
| K2 | `lib/format-admin.ts` | Used by 6 admin components |
| K3 | `src/assets.d.ts` | TypeScript ambient module declaration; picked up by tsconfig glob, required for `*.png` imports |
| K4 | `src/styles/typography.css` | Imported by `app/globals.css` |
| K5 | `components/ui/aurora-backdrop.tsx` | Imported by `section-shell.tsx`; the import is unused there too (SAFE #42), but `AuroraBackdrop` itself is a legitimate component |
| K6 | `components/ui/noise-overlay.tsx` | Used by `empty-state.tsx` line 39 |
| K7 | `scripts/sync-monaco.mjs` | Invoked by `package.json` scripts |
| K8 | `components/ui/carousel.tsx` react-hooks/set-state-in-effect | Pre-existing shadcn/ui pattern; do not change behaviour |
| K9 | `components/landing/premium-sections.tsx — LiveLearningTicker, MarketingProofBar exports` | These are exported functions, might be intentionally kept for future use; do not delete the export |

---

## Duplication Report (for reference only, do not consolidate in this PR)

| # | Files | Similarity | Suggested target |
|---|---|---|---|
| D1 | `components/courses/course-detail-client.tsx:coverGradient` vs `components/dashboard/my-learning.tsx:coverGradient` | ~100% | `lib/visual.ts` (already has `hueForId`) |
| D2 | `components/ui/glow-orb.tsx` (returns null) vs `components/layout/demo-mode-badge.tsx` (returns null) | Structural pattern | Both are stub components with dead imports |
