## 0. Baseline — what the frontend already has (don't rebuild)

The current frontend is not a blank slate. It ships:

- **Design system** — OKLCH tokens with AAA contrast (`app/globals.css`), 3-step surface
  elevation, frosted-glass utilities (`@utility frosted*`), dual XP tracks, radius scale.
- **Motion library** — `components/motion/`: `magnetic`, `parallax`, `text-reveal`,
  `marquee`, `spotlight`, `tilt-card`, `stagger-group`, `animated-number`, `gesture-sheet`,
  `use-gesture-sheet`, `text-scramble`, `reveal`, plus a token file (`motion-tokens.ts`) with
  springs/easings house style.
- **Data visualization** — `components/viz/`: `area-chart`, `radar-chart`, `ring-progress`,
  `sparkline` — shared across dashboard, admin, and gamification surfaces.
- **App shell** — frosted top-nav with breadcrumbs, global command palette (`cmdk`),
  categorized notification center, offline indicator, rank/XP chip, mobile gesture sheet,
  bottom navigation, keyboard shortcuts modal, route transition animations, AI tutor chatbot.
- **Landing** — hero, learning loop, terminal mock, pricing, testimonials, FAQ, social proof,
  trust highlights, live-learner ticker, marquee of skills, judge mock, conversion sections,
  personalized hero variant.
- **Product surfaces** — courses/player (video + reading progress + notes + certificate +
  trust panel + hover previews + marketplace), judge IDE (Monaco + editorial tab + peer
  solutions tab + challenges page + challenge IDE + contest mode with live leaderboard,
  countdown timer, and combo meter), labs (terminal + notebook + sessions + Guacamole stub +
  hints panel + team/co-op presence with shared cursor overlay + post-lab writeup modal),
  assessments (catalog + attempts + combo meter + combo teaser + interviews), rank/badges
  (rank hub + skill tree + skill radar + badge wall + season pass + level-up celebration +
  ledger viewer + share cards), leaderboards, guilds, profile (redesigned with profile
  completion tracker), cart/checkout/billing (+ order history + cart badge + checkout outage +
  buy-now/add-to-cart), admin (dashboard + users + courses + orders + reviews + support queue +
  audit + analytics + problems + labs + ledger detail + reconciliation + walkthrough + data table).
- **Platform content** — learning paths (catalog + detail + evidence trail), next-move card,
  learning insights, interview prep, coding challenges, mentors directory, saved content,
  support ticket system (create + list + threaded detail), onboarding dialog, navigation tour,
  demo settings panel.
- **IDE** — `components/ide/`: full IDE shell with Monaco editor, panel system, preview pane,
  statement viewer, sandbox frame, workspace hook.
- **SEO & compliance** — breadcrumbs, JSON-LD, OpenGraph/Twitter images, sitemap, robots,
  cookie consent banner, privacy policy, terms of service, FAQ page, pricing page, thank-you
  page.
- **Offline** — offline fallback page, service-worker provider, offline course reader, offline
  index.

The improvements below are **gaps and upgrades**, not a reset.

---

## 1. Brand & visual identity

| # | Item | Where | Notes |
|---|------|-------|-------|
| 1.1 | **Signature color moment** | landing + app | One repeatable brand effect (aurora gradient wash at section transitions). Currently the brand color is used sparingly and the UI reads mostly monochrome. |
| 1.2 | **Typography tightening** | `src/styles/typography.css` | Fluid `clamp()` type scale, tighter tracking on `font-display`, consistent `font-mono` for data. |
| 1.3 | **Noise + glow utilities wired in** | landing sections | `noise-overlay`, `glow-orb`, `aurora-backdrop` exist but are barely used on the marketing page. |

## 2. Landing — convert like a SaaS, feel like a school

| # | Item | Where | Status | Notes |
|---|------|-------|--------|-------|
| 2.1 | **Interactive hero mock** | `landing/hero-section.tsx` + `landing/live-demo.tsx` + `landing/judge-mock.tsx` | ✅ Done | Browser-framed window of the real Judge/IDE with a typing cursor → "Accepted" verdict. |
| 2.2 | **Logo trust bar** | `landing/social-proof.tsx` | ✅ Done | Social proof section with learner ticker + trust highlights (`landing/trust-highlights.tsx`). |
| 2.3 | **Comparison section** | `landing/conversion-sections.tsx` | ✅ Done | "Generic tutorial vs. Zapsters" table with verified progression (`landing/verified-progression.tsx`). |
| 2.4 | **Outcome stats band** | `landing/social-proof.tsx` | ✅ Done | Scroll-into-view count-up using `animated-number`. |
| 2.5 | **Learner case-study narrative** | `landing/conversion-sections.tsx` | ✅ Done | Integrated into conversion sections with learning loop narrative. |
| 2.6 | **Animated text effects** | `motion/text-scramble.tsx` + `motion/text-reveal.tsx` | ✅ Done | Text scramble + animated gradient text for eyebrows and headline keywords. |

## 3. Onboarding & activation

| # | Item | Where | Status | Notes |
|---|------|-------|--------|-------|
| 3.1 | **Stepped onboarding** | `dashboard/onboarding-dialog.tsx` | ✅ Done | Multi-step flow with progress bar: goals → skill chips → time commitment → personalized plan. |
| 3.2 | **First-session guided tour** | `demo/navigation-tour.tsx` | ✅ Done | Spotlight walkthrough over Judge / Labs / Rank after onboarding. |
| 3.3 | **Weekly goal + ring** | `dashboard/dashboard.tsx` | ✅ Done | Weekly goal card with radial progress (uses `viz/ring-progress.tsx`). Retention mechanic (Duolingo-class). |

## 4. Learning experience (core product)

| # | Item | Where | Status | Notes |
|---|------|-------|--------|-------|
| 4.1 | **Player premium pass** | `courses/player-client.tsx` | ✅ Done | Chapter/section sidebar, autoplay-next, keyboard shortcuts (space/arrows), transcript panel. |
| 4.2 | **Per-lesson mastery state** | player lesson list + `dashboard/progress-pulse.tsx` | ✅ Done | not-started / in-progress / verified per lesson with mini progress rings. |
| 4.3 | **In-video checkpoint quizzes** | player | ⬜ Gap | End-of-lesson question with instant feedback + XP (Pluralsight/Coursera staple). |
| 4.4 | **Continue-learning card** | `learning/next-move.tsx` | ✅ Done | Full-width card: thumbnail, progress, resume button, time estimate. |
| 4.5 | **Certificate share moment** | `courses/certificate-dialog.tsx` | ✅ Done | Animated SVG seal/stamp (line-draw on verify) + reuse `gamification/share-card-modal.tsx` for download/share. |

## 5. Dashboard & data-viz (bklit playbook)

| # | Item | Where | Status | Notes |
|---|------|-------|--------|-------|
| 5.1 | **KPI row with sparklines** | `dashboard/dashboard.tsx` + `viz/sparkline.tsx` | ✅ Done | Stat cards with inline SVG sparkline + count-up. |
| 5.2 | **Activity heatmap** | `dashboard/progress-pulse.tsx` | ✅ Done | GitHub-style streak calendar — the #1 "habit" visual. |
| 5.3 | **Weekly area chart** | `dashboard/learning-insights.tsx` + `viz/area-chart.tsx` | ✅ Done | Learning insights panel with animated area chart. |
| 5.4 | **Rank ring gauge** | `dashboard/dashboard.tsx` + `viz/ring-progress.tsx` | ✅ Done | Radial ring for rank/XP progress. |
| 5.5 | **Skill radar** | `gamification/skill-radar.tsx` + `viz/radar-chart.tsx` | ✅ Done | Radar chart for skill coverage. |
| 5.6 | **Admin analytics upgrade** | `admin/analytics-client.tsx` | ⬜ Gap | Animated area chart exists; funnel (visit→enroll→complete), heatmap still needed. |

## 6. Gamification — make progress feel rewarding

| # | Item | Where | Status | Notes |
|---|------|-------|--------|-------|
| 6.1 | **Level-up celebration** | `gamification/level-up-celebration.tsx` + `gamification/xp-flyout.tsx` | ✅ Done | Full-screen canvas confetti + modal on rank/level change. |
| 6.2 | **Leaderboard FLIP** | `gamification/leaderboard-client.tsx` | ⬜ Gap | Animate re-ordering with `layout` so live position changes glide. |
| 6.3 | **Badge unlock flash** | `gamification/badge-wall.tsx` | ⬜ Gap | Newly-unlocked badges get glow ring + tooltip with the path to the next badge. |

## 7. Commerce — trust at the money moment

| # | Item | Where | Status | Notes |
|---|------|-------|--------|-------|
| 7.1 | **Checkout polish** | `commerce/checkout-client.tsx` + `commerce/checkout-outage.tsx` | ✅ Done | Trust badges row, animated order summary, checkout outage fallback, "what happens next" mini-timeline. |
| 7.2 | **Pricing trust band + toggle** | `landing/premium-sections.tsx` + `/pricing` page | ✅ Done | Guarantee strip under plans; animated segmented Monthly/Yearly toggle with spring. Standalone pricing page also shipped. |

## 8. App shell & navigation craft

| # | Item | Where | Status | Notes |
|---|------|-------|--------|-------|
| 8.1 | **Side rail polish** | `layout/side-nav.tsx` | ✅ Done | Animated active-indicator glide, collapsible hover rail, unread dots per section. |
| 8.2 | **Route transitions** | `layout/page-transition.tsx` | ✅ Done | Cross-fade/translate between routes using motion.dev. |
| 8.3 | **Toast + empty-state consistency** | `ui/sonner.tsx`, `shared/empty-state.tsx` | ✅ Done | Standardized sonner (icon + action + undo); illustrated, on-brand empty states. |
| 8.4 | **Keyboard-first** | `layout/keyboard-shortcuts.tsx` | ✅ Done | ⌘K hint + shortcuts help modal. |

## 9. Craft & discipline (the differentiator)

| # | Item | Where | Status | Notes |
|---|------|-------|--------|-------|
| 9.1 | **Motion budget** | all components | ⬜ Gap | Animate only `transform`/`opacity`; use `motionSprings`/`motionEasings` tokens everywhere (some components hardcode `easeOut`); gate all effects behind `useReducedMotion`. |
| 9.2 | **Micro-interactions** | buttons/cards/links | ⬜ Gap | Global `whileTap` press-scale, icon micro-rotation on hover, link underline draw. |
| 9.3 | **Performance** | images, routes | ⬜ Gap | `next/image` everywhere, prefetch key routes, lazy-load below-the-fold landing sections. |

---

## 10. Priority shortlist — remaining gaps, highest ROI first

1. **In-video checkpoint quizzes** (4.3) — the only core learning loop feature still missing.
2. **Leaderboard FLIP animations** (6.2) — cheap, transforms the gamification feel.
3. **Motion budget audit + micro-interactions** (9.1 + 9.2) — consistent motion tokens and press-scale across all interactive elements.
4. **Badge unlock flash** (6.3) — makes badge collection feel rewarding.
5. **Admin analytics funnel + heatmap** (5.6) — completes the admin reporting surface.
6. **Performance pass** (9.3) — `next/image` audit, route prefetching, lazy-load below-the-fold.

---