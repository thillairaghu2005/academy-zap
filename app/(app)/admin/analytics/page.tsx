import type { Metadata } from "next";

import { AnalyticsClient } from "@/components/admin/analytics-client";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Demo learning analytics for Zapsters administrators.",
};

export default function AdminAnalyticsPage() {
  return <AnalyticsClient />;
}
