import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChartColumn,
  ClipboardList,
  CodeXml,
  FlaskConical,
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
      "Real video streaming / signed-URL serving (Content backend deferred)",
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
      "Monaco editor pane — Python only, per the backend Phase-1 slice",
      "Submit flow: 202 + submission_id → poll → JudgeResult",
      "All five verdict states styled distinctly, literals verbatim",
      "Per-problem submission history (mock table read)",
    ],
    notBuiltYet: [
      "Real gVisor sandbox execution (Judge backend deferred)",
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
      "Provision an isolated sandbox, drive a real xterm.js terminal over the mock WebSocket bridge, and verify objectives server-side.",
    planned: [
      "Lab catalog + detail (objectives, difficulty, estimated time)",
      "Start-Lab provisioning flow with loading states",
      "xterm.js terminal wired to a scripted mock terminal feed",
      "Session timer, objectives panel, timeout/end states",
      "Guacamole GUI viewer stub for GUI-required labs",
    ],
    notBuiltYet: [
      "Real Firecracker microVMs / ttyd bridge (Lab backend deferred)",
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
      "Timed MCQ / short-answer / code flow with server-side grading, a live combo meter, and anti-cheat telemetry capture.",
    planned: [
      "MCQ / short-answer / code-question flow (code reuses the F2 Monaco pane)",
      "Timer, attempt tracking, submit confirmation",
      "Live combo/multiplier meter driven by a scripted interval (SSE in prod)",
      "Anti-cheat telemetry hooks (tab-visibility, paste) logging to console",
    ],
    notBuiltYet: [
      "Real grading (Assessment backend deferred)",
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
      "ProgressContext hub: rank ladder, dual XP tracks, streak, league, guild, frozen-state banner, share-card modal.",
    planned: [
      "Full rank ladder with the exact rank names (Initiate → Deus)",
      "Completion XP and Mastery XP as two never-blended tracks",
      "Streak widget: freeze tokens, momentum multiplier, grace period",
      "Badge wall + verify page (verified / flagged / revoked states)",
      "Share-card modal with html-to-image client preview + hash-stamped card",
    ],
    notBuiltYet: [
      "Any client-side XP/rank math — every number comes from the mock gamification API",
      "Real ledger hash-chain verification (Gamification backend deferred)",
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
    tagline: "Global & guild boards, ZRANGE-shaped",
    description:
      "Paginated leaderboard rows shaped like Redis ZRANGE reads — global and guild scopes, server-derived scores.",
    planned: [
      "Global + guild leaderboards with mock ZRANGE-shaped pagination",
      "Medal styling for top-3 ranks, current user highlighted",
      "Season/league standing: tier badge (bronze → obsidian), promotion/relegation zones (on /rank)",
    ],
    notBuiltYet: [
      "Live SSE ticks (leaderboard backend deferred)",
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
      "Guild boards with member rollups, combined XP, guild-vs-guild bars and the d3 skill tree.",
    planned: [
      "Guild board: member list + combined XP rollup",
      "Guild-vs-guild comparison view",
      "Skill tree visualization (d3 tree) over category XP",
    ],
    notBuiltYet: [
      "Guild CRUD / invites (Gamification backend deferred)",
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
    tagline: "Cart + hosted checkout embeds only",
    description:
      "Cart, checkout sessions rendered around Razorpay/Stripe hosted checkout embeds, entitlement gating, and B2B seats — never a custom card field.",
    planned: [
      "Cart page with quantity steppers, totals, empty/error states",
      "Checkout session page: hosted embed mock with pending / paid / failed / expired / 503 states",
      "Webhook idempotency demo — replaying a webhook never double-charges",
      "Entitlement gating UI for unpurchased courses/labs (Buy → cart → hosted checkout)",
      "Subscription / B2B seat management screens (mock read model)",
    ],
    notBuiltYet: [
      "Custom card-number input of any kind — PCI scope stays with the providers",
      "Real payment capture / provider webhooks (Commerce backend deferred)",
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
      "Role-gated admin console: course authoring with draft → in-review → published, the two-person review flow, manage-style lists for orders/users/labs/problems, and an append-only audit log.",
    planned: [
      "Admin role gate + distinct layout with section sidebar",
      "Course CRUD: create/edit/delete + draft → submit-for-review → second-reviewer publish + preview link",
      "Generic DataTable (search, filters, sort, pagination, loading/empty/error states)",
      "Manage-style lists: orders, users (role toggles), labs, problems",
      "Moderation / audit-log view (mock append-only rendering)",
    ],
    notBuiltYet: [
      "Real role-gated admin APIs — the client gate is frontend-only by design (build.md §4.2 RBAC)",
      "Authoring CRUD for labs/problems/assessments (out of the F7 scope)",
    ],
  },
];

export function getSurface(slug: string): SurfaceMeta | undefined {
  return surfaces.find((s) => s.slug === slug);
}
