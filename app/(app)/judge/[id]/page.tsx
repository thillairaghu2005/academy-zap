import type { Metadata } from "next";

import { ProblemDetailClient } from "@/components/judge/problem-detail-client";

interface JudgeProblemPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Problem",
  description:
    "Judge Engine — solve the problem in the Monaco editor, submit, and get a deterministic verdict.",
};

export default async function JudgeProblemPage({
  params,
}: JudgeProblemPageProps) {
  const { id } = await params;
  // All data fetching + state handling (loading / 404 / verdicts) lives in
  // the client — the Monaco editor forces a client surface anyway.
  return <ProblemDetailClient problemId={id} />;
}
