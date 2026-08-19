# Frontend Improvements — UI Roadmap

Prioritized frontend improvements for academy-zap, informed by two reference projects:

- **Watermelon UI** — https://ui.watermelon.sh · https://github.com/WatermelonCorp/watermelon-platform
- **Motion Primitives** — https://motion-primitives.com/ · https://github.com/ibelick/motion-primitives

Each item is grounded in the actual codebase (file paths + line numbers where relevant) and is tagged with impact/effort.

---

## High Impact, Low Effort

### 1. Activate the 8 unused motion primitives

`components/motion/` is a small in-house "motion-primitives" library, but most of it is dead code.

Used today:
- `animated-number`, `magnetic`, `gesture-sheet` / `use-gesture-sheet`, `motion-tokens`

**Never imported anywhere (verified by grep):**
- `marquee`, `count-up`, `spotlight`, `tilt-card`, `text-reveal`, `stagger-group`, `parallax`, `reveal`

**Concrete placements (the motion-primitives lesson):**

| Primitive | Where to use |
|---|---|
| `TiltCard` + `Spotlight` | Featured-course and category cards (Watermelon UI's registry grid cards) |
| `Marquee` | Testimonials / course-preview strip (motion-primitives' album-art marquee rows) |
| `Parallax` | Static hero PNGs |
| `TextReveal` / `StaggerGroup` | Hero headline, replacing hand-rolled variants |
| `Reveal` | Scroll-into-view sections |

**Why:** Pure win — zero new dependencies, the components already exist and are unused.

**Effort:** Half a day.

---

### 2. "Generating code…" streaming effect for the AI Tutor

`components/ai/tutor.tsx` is a deterministic keyword-matching chatbot (branded "Deterministic help"). Motion-primitives' homepage embeds an AI mock with a live "Generating code…" typewriter/streaming skeleton.

**Do:** Add a typewriter/streaming skeleton so responses appear to stream, making the tutor feel alive while staying deterministic.

**Effort:** A few hours.

---

## Medium Effort

### 3. Replace the hard-coded admin analytics chart

`components/admin/analytics-client.tsx:10-19` — "Engagement trend" is a hand-rolled CSS bar chart fed by a hard-coded 12-week array (`WEEKS = [42, 65, 32, 78…]`).

**Do:** Build a proper chart from real analytics data. `d3` is already a dependency (used only for the skill tree); recharts is what Watermelon UI's dashboards use. Also ensure chart colors read correctly in dark mode.

**Effort:** Half a day.

---

### 4. Interactive in-page demos on the landing page

Motion-primitives embeds live demos (calendar, tabs, AI mock) directly on the homepage. Academy-zap's judge/IDE/lab are rich but only shown via static PNGs.

**Do:** Embed a small live mock on the landing page — e.g. a fake code-editor typing loop or a lab terminal — in the Hero or LearningLoop section instead of static screenshots.

**Effort:** Half a day.

---

### 5. Watermelon UI's `comingSoon` placeholder pattern

`components/shared/surface-stub.tsx` is a well-crafted "honest stub" page, but it is dead code — all 10 surfaces in `lib/surfaces.ts` are `status: "shipped"`, so the dashboard's "Preview/Coming next" labels (`components/dashboard/dashboard.tsx:39`) never render.

**Do:** Mark genuine roadmap items `comingSoon` and re-activate the stub, exactly like Watermelon UI's `comingSoon: true` placeholder components.

**Effort:** Half a day.

---

## Cleanup & Correctness

### 6. Fix `hueForId` / `coverGradient`

`components/dashboard/my-learning.tsx:22-36` — `hueForId` computes a per-course hue, but `coverGradient` ignores it, so every course cover renders the same gradient.

**Do:** Apply the computed hue so each course gets a distinct cover gradient.

**Effort:** 30 minutes.

---

### 7. Prune redundant code

- `count-up` duplicates `animated-number`'s job — pick one.
- `components/layout/logo.tsx` is an unnecessary indirection to `src/components/Logo/Logo.tsx`.
- Inline `style={{ fontFamily: "'Geist Variable', sans-serif", fontWeight: 100 }}` usages (e.g. `components/landing/landing-page.tsx`, `premium-sections.tsx:77`) should use the typography system in `src/styles/typography.css`.

**Effort:** A few hours.

---

### 8. Loading / error boundaries on public routes

Only `(app)` routes have `loading.tsx`; marketing, pricing, and auth pages have none. `error.tsx` exists globally.

**Do:** Add per-route `loading.tsx` / `error.tsx` to `(marketing)`, `pricing`, and auth routes for consistent fallbacks.

**Effort:** A few hours.

---

## Optional / Strategic

### 9. Upgrade the ⌘K command palette

`components/layout/global-search.tsx` exists, but Watermelon UI's command palette searches everything — components, dashboards, and actions — not just one content type.

**Do:** Extend the palette to search courses + surfaces + actions (command-palette semantics), matching that signature UX.

**Effort:** 1-2 days.

---

## Reference Notes

### Watermelon UI (component registry)

- React 18 + Vite + TypeScript, Tailwind 4, shadcn/ui, Motion, Hugeicons/Lucide, Recharts.
- MDX-driven auto-discovery of components and dashboards.
- Live previews, syntax-highlighted code blocks, one-click CLI install copy.
- Command palette (⌘K) searches all components and dashboards.
- Dark mode, mobile drawer views, `comingSoon` placeholders.

### Motion Primitives (animated UI kit)

- Copy-paste motion components built on motion.dev + Tailwind.
- Signature patterns: scroll-driven image galleries, album-art marquee rows, text-scramble/typewriter effects, and live embedded demos on the homepage.