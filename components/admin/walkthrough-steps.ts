/**
 * Walkthrough step data and type — kept in a separate file so
 * admin-walkthrough.tsx (component) is a pure React module that Vite/
 * react-refresh Fast Refresh can hot-replace without a full page reload.
 */

export interface WalkthroughStep {
  title: string;
  /** Where the surface lives in the real UI. */
  element: string;
  /** Short factual copy — documents what's built, not aspirational. */
  copy: string;
  href: string;
}

export const ADMIN_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    title: "Dashboard",
    element: "The page you're on",
    copy: "Stat cards with live mock counts (courses, labs, problems, orders, users) plus the five most recent audit entries.",
    href: "/admin",
  },
  {
    title: "Courses",
    element: "Left sidebar → Courses",
    copy: "The authoring surface: create, edit and delete courses, submit drafts for review, and publish via a second reviewer. The preview button opens the real course page in preview mode.",
    href: "/admin/courses",
  },
  {
    title: "Problems",
    element: "Left sidebar → Problems",
    copy: "Manage-style list of judge problems — difficulty, language and acceptance rate. Read-only until problem authoring lands.",
    href: "/admin/problems",
  },
  {
    title: "Labs",
    element: "Left sidebar → Labs",
    copy: "Manage-style list of virtual labs with difficulty and objectives counts. Read-only list.",
    href: "/admin/labs",
  },
  {
    title: "Orders",
    element: "Left sidebar → Orders",
    copy: "Every mock order from the checkout flow, with paid / failed / refunded status badges.",
    href: "/admin/orders",
  },
  {
    title: "Users",
    element: "Left sidebar → Users",
    copy: "The platform's mock identities with role toggles (learner ⇄ admin). This is a frontend-only demo role check.",
    href: "/admin/users",
  },
  {
    title: "Audit log",
    element: "Left sidebar → Audit log",
    copy: "Append-only moderation trail. XP-affecting rows link to their ledger entry (expandable), and the reconciliation panel checks ledger sums against cached balances — the verdict is server-computed, never client math.",
    href: "/admin/audit",
  },
];
