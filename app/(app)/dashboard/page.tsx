import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Command center for every Zapsters surface — courses, judge, labs, assessments, ranks and commerce.",
};

/**
 * Dashboard — moved from "/" to /dashboard so the root route can serve the
 * public course catalog as the landing page. Session-gated by proxy.ts like
 * every other signed-in surface.
 */
export default function DashboardPage() {
  return <Dashboard />;
}
