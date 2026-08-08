import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChartColumn,
  ClipboardList,
  CodeXml,
  FlaskConical,
  LifeBuoy,
  ShieldCheck,
  ShoppingCart,
  Trophy,
  Users,
} from "lucide-react";

/**
 * Platform surface registry (build.md §2 build order).
 *
 * One entry per subsystem route. It drives the dashboard grid AND the stub
 * pages, so every F-section stub is honest about what it will contain and
 * what is deliberately not being built yet (build.md §3).
 */

export type SurfaceStatus = "shipped" | "next" | "stubbed";

export interface SurfaceMeta {
  slug: string;
  href: string;
  /** Engine name, e.g. "Content Engine" */
  title: string;
  /** Short nav label, e.g. "Courses" */
  navLabel: string;
  /** Build-section tag, e.g. "F1" */
  stage: string;
  status: SurfaceStatus;
  icon: LucideIcon;
  /** Gradient stops for the icon tile */
  accent: string;
  tagline: string;
  description: string;
  planned: string[];
  notBuiltYet: string[];
}

export const surfaces: SurfaceMeta[] = [
  {
    slug: "courses",
    href: "/courses",
    title: "Content Engine",
    navLabel: "Courses",
    stage: "F1",
    status: "shipped",
    icon: BookOpen,
    accent: "from-violet-500 to-fuchsia-500",
    tagline: "Udemy-shaped course catalog & video player",
    description:
      "Browse the catalog, open a course, and play video lessons with captions, playback speed and resume position.",
    planned: [
      "Catalog/browse page wired to a mock Meilisearch response shape",
      "Course detail: syllabus, enrollment CTA, reviews placeholder",
      "video.js player with mock signed-manifest URLs + lesson sidebar",
      "Per-lesson progress feeding mock enrollments state",
    ],
    notBuiltYet: [
      "Real video streaming and signed-URL serving are outside the frontend demo",
      "Full catalog search indexing",
    ],
  },
  {
    slug: "judge",
    href: "/judge",
    title: "Judge Engine",
    navLabel: "Judge",
    stage: "F2",
    status: "shipped",
    icon: CodeXml,
    accent: "from-cyan-400 to-blue-500",
    tagline: "HackerRank-shaped code judge",
    description:
      "Solve problems in the Monaco editor, submit, and get deterministic verdicts from the mock judge API.",
    planned: [
      "Problem list + detail (statement, constraints, starter code)",
      "Monaco editor pane with a frontend-only Python simulation",
      "Submit flow: 202 + submission_id → poll → JudgeResult",
      "All five verdict states styled distinctly, literals verbatim",
      "Per-problem submission history (mock table read)",
    ],
    notBuiltYet: [
      "Real sandbox execution is outside the frontend demo",
      "Multi-language picker ahead of the real language slice",
      "Leaderboard impact of verdicts — arrives with F5 events",
    ],
  },
  {
    slug: "labs",
    href: "/labs",
    title: "Lab Engine",
    navLabel: "Labs",
    stage: "F3",
    status: "shipped",
    icon: FlaskConical,
    accent: "from-emerald-400 to-teal-500",
    tagline: "TryHackMe-shaped virtual labs",
    description:
      "Drive a simulated xterm.js terminal and verify objectives with local demo state.",
    planned: [
      "Lab catalog + detail (objectives, difficulty, estimated time)",
      "Start-Lab provisioning flow with loading states",
      "xterm.js terminal wired to a scripted mock terminal feed",
      "Session timer, objectives panel, timeout/end states",
      "Guacamole GUI viewer stub for GUI-required labs",
    ],
    notBuiltYet: [
      "Real Firecracker microVMs and ttyd are outside the frontend demo",
      "Guacamole GUI stream (container UI stubbed only)",
    ],
  },
  {
    slug: "assessments",
    href: "/assessments",
    title: "Assessment Engine",
    navLabel: "Assessments",
    stage: "F4",
    status: "shipped",
    icon: ClipboardList,
    accent: "from-amber-400 to-orange-500",
    tagline: "MCQ, short-answer & code questions",
    description:
      "Timed MCQ, short-answer, and code flow with deterministic demo grading, a live combo meter, and telemetry capture.",
    planned: [
      "MCQ / short-answer / code-question flow (code reuses the F2 Monaco pane)",
      "Timer, attempt tracking, submit confirmation",
      "Live combo/multiplier meter driven by a scripted interval (SSE in prod)",
      "Anti-cheat telemetry hooks (tab-visibility, paste) logging to console",
    ],
    notBuiltYet: [
      "Real grading is outside the frontend demo",
      "LLM-graded anything — scoring stays deterministic by design",
    ],
  },
  {
    slug: "rank",
    href: "/rank",
    title: "Rank Ladder",
    navLabel: "Rank",
    stage: "F5",
    status: "shipped",
    icon: Trophy,
    accent: "from-fuchsia-500 to-pink-500",
    tagline: "Initiate → Deus, with Prestige rebirth",
    description:
      "Your rank, dual XP tracks, daily streak, league standing and guild — one climb, fully visible, with a shareable rank card.",
    planned: [
      "Full rank ladder with the exact rank names (Initiate → Deus)",
      "Completion XP and Mastery XP as two never-blended tracks",
      "Streak widget: freeze tokens, momentum multiplier, grace period",
      "Badge wall + verify page (verified / flagged / revoked states)",
      "Share-card modal with html-to-image client preview + hash-stamped card",
    ],
    notBuiltYet: [
      "Any client-side XP/rank math — every number comes from the mock gamification API",
      "Ledger hash-chain verification is simulated locally",
    ],
  },
  {
    slug: "leaderboards",
    href: "/leaderboards",
    title: "Leaderboards",
    navLabel: "Leaderboards",
    stage: "F5",
    status: "shipped",
    icon: ChartColumn,
    accent: "from-sky-400 to-cyan-500",
    tagline: "Global & guild boards",
    description:
      "Global and guild leaderboards with your standing highlighted, top-3 medals, and promotion / relegation zones.",
    planned: [
      "Global + guild leaderboards with mock ZRANGE-shaped pagination",
      "Medal styling for top-3 ranks, current user highlighted",
      "Season/league standing: tier badge (bronze → obsidian), promotion/relegation zones (on /rank)",
    ],
    notBuiltYet: [
      "Live leaderboard ticks are outside the frontend demo",
      "Real Redis sorted-set reads",
    ],
  },
  {
    slug: "guilds",
    href: "/guilds",
    title: "Guilds",
    navLabel: "Guilds",
    stage: "F5",
    status: "shipped",
    icon: Users,
    accent: "from-purple-500 to-violet-500",
    tagline: "Cohorts with combined XP",
    description:
      "Guild boards with member rollups, combined XP, guild-vs-guild comparison, and a skill-tree visualization of your category XP.",
    planned: [
      "Guild board: member list + combined XP rollup",
      "Guild-vs-guild comparison view",
      "Skill tree visualization (d3 tree) over category XP",
    ],
    notBuiltYet: [
      "Guild CRUD and invites are outside the frontend demo",
    ],
  },
  {
    slug: "checkout",
    href: "/cart",
    title: "Commerce",
    navLabel: "Cart & checkout",
    stage: "F6",
    status: "shipped",
    icon: ShoppingCart,
    accent: "from-emerald-400 to-green-500",
    tagline: "Cart, checkout & billing",
    description:
      "Buy courses and lab passes through a provider-hosted checkout page, manage your entitlements, and review subscriptions and seats — Zapsters never touches your card details.",
    planned: [
      "Cart page with quantity steppers, totals, empty/error states",
      "Checkout session page: hosted embed mock with pending / paid / failed / expired / 503 states",
      "Webhook idempotency demo — replaying a webhook never double-charges",
      "Entitlement gating UI for unpurchased courses/labs (Buy → cart → hosted checkout)",
      "Subscription / B2B seat management screens (mock read model)",
    ],
    notBuiltYet: [
      "Custom card-number input of any kind — PCI scope stays with the providers",
      "Real payment capture and provider webhooks are outside the frontend demo",
      "Seat provisioning, invites, reassignment (docs leave open)",
    ],
  },
  {
    slug: "admin",
    href: "/admin",
    title: "Admin / CMS",
    navLabel: "Admin",
    stage: "F7",
    status: "shipped",
    icon: ShieldCheck,
    accent: "from-slate-400 to-slate-600",
    tagline: "Authoring, review & audit",
    description:
      "Role-gated console for course authoring, the two-person review flow, manage lists, and an append-only audit log for platform admins.",
    planned: [
      "Admin role gate + distinct layout with section sidebar",
      "Course CRUD: create/edit/delete + draft → submit-for-review → second-reviewer publish + preview link",
      "Draft editor with debounced autosave + real /courses/[id]?preview=1 draft preview",
      "In-review state: locked form, field-level diff vs the last published version, reviewer picker enforcing the two-person rule (disabled + tooltip)",
      "Generic DataTable (search, filters, sort, pagination, loading/empty/error states, expandable rows)",
      "Manage-style lists: orders, users (role toggles), labs, problems",
      "Append-only audit log with actor/event/date/ledger-linked filters, expandable linked ledger entries, and a balance-reconciliation panel",
      "Guided admin walkthrough overlay (first-visit, replayable from the sidebar)",
    ],
    notBuiltYet: [
      "Real role-gated admin APIs — the client gate is frontend-only by design (build.md §4.2 RBAC)",
      "Authoring CRUD for labs/problems/assessments (out of the F7 scope)",
      "CSV export / i18n / full draft revision history (explicitly deferred)",
    ],
  },
  {
    slug: "support",
    href: "/support",
    title: "Support",
    navLabel: "Support",
    stage: "Add-on",
    status: "shipped",
    icon: LifeBuoy,
    accent: "from-rose-400 to-pink-500",
    tagline: "Learner tickets + admin queue",
    description:
      "Ticket threads with an enforced status workflow, learner isolation, agent-only internal notes, and an admin queue with assignment.",
    planned: [
      "Learner ticket list with status tabs + create form (react-hook-form + zod)",
      "Ticket threads: reply, reopen-on-reply, closed disabled state, not-found isolation",
      "Admin queue (shared DataTable) with status / priority / category filters",
      "Agent detail: assignee picker, workflow transition buttons, internal notes + replies",
      "Status machine enforced by local demo data + audit-logged admin actions",
    ],
    notBuiltYet: [
      "Real support platform integration — this surface is beyond build.md's F0–F7 plan (see register)",
      "Email notifications / SLAs / CSAT surveys",
    ],
  },
];

export function getSurface(slug: string): SurfaceMeta | undefined {
  return surfaces.find((s) => s.slug === slug);
}
