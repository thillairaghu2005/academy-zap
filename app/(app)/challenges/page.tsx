import type { Metadata } from "next";

import { Challenges } from "@/components/judge/challenges";

export const metadata: Metadata = {
  title: "Challenges",
  description: "Test your skills with coding problems and rise up the leaderboards.",
};

export default function ChallengesPage() {
  return <Challenges />;
}
