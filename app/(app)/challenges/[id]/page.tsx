import type { Metadata } from "next";

import { ChallengeIDE } from "@/components/judge/challenge-ide";

export const metadata: Metadata = {
  title: "Solve Challenge",
  description: "Code and run your solution in the integrated judge sandbox.",
};

// In Next.js App Router, dynamic route params are awaited in Server Components
export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ChallengeIDE id={resolvedParams.id} />;
}
