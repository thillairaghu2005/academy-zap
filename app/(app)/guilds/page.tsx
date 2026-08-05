import type { Metadata } from "next";

import { GuildClient } from "@/components/gamification/guild-client";

export const metadata: Metadata = {
  title: "Guilds",
  description:
    "Guild boards — member rollups, combined XP, guild-vs-guild and the skill tree projection.",
};

export default function GuildsPage() {
  return <GuildClient />;
}
