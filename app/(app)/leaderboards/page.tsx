import type { Metadata } from "next";

import { LeaderboardClient } from "@/components/gamification/leaderboard-client";

export const metadata: Metadata = {
  title: "Leaderboards",
  description:
    "Global and guild leaderboards — ZRANGE-shaped pagination over server-derived ranks.",
};

export default function LeaderboardsPage() {
  return <LeaderboardClient />;
}
