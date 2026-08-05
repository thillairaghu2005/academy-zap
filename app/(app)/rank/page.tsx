import type { Metadata } from "next";

import { RankHubClient } from "@/components/gamification/rank-hub-client";

export const metadata: Metadata = {
  title: "Rank Ladder",
  description:
    "Gamification — Initiate → Deus with Prestige rebirth, dual XP tracks, streaks, leagues and guilds.",
};

export default function RankPage() {
  return <RankHubClient />;
}
