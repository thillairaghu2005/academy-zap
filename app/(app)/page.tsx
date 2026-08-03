import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Command center for every Zapsters surface — courses, judge, labs, assessments, ranks and commerce.",
};

export default function DashboardPage() {
  return <Dashboard />;
}
