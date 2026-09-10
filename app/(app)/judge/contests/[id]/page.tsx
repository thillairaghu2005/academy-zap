import { notFound } from "next/navigation";
import { ContestClient } from "@/components/judge/contest-client";
import { getProblem } from "@/lib/data/judge-facade";

export default async function ContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Try to load a problem to act as the contest problem
  let problem;
  try {
    problem = await getProblem(id);
  } catch (err) {
    problem = await getProblem("p-two-sum"); // Fallback for the mock
  }

  if (!problem) {
    notFound();
  }

  return <ContestClient problemId={problem.id} initialProblem={problem} />;
}
