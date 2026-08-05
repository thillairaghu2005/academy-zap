import type { Metadata } from "next";

import { ProblemListClient } from "@/components/judge/problem-list-client";

export const metadata: Metadata = {
  title: "Judge Engine",
  description:
    "Judge Engine — HackerRank-shaped code judge. Solve problems in the Monaco editor and get deterministic verdicts.",
};

export default function JudgePage() {
  return <ProblemListClient />;
}
