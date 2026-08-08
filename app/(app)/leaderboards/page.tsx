import type { Metadata } from "next";

import { LeaderboardClient } from "@/components/gamification/leaderboard-client";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Leaderboards", description: "See the global and guild demo climb on Zapsters.", path: "/leaderboards", keywords: ["leaderboard", "rank", "guild"] });

export default function LeaderboardsPage() {
  return <LeaderboardClient />;
}
