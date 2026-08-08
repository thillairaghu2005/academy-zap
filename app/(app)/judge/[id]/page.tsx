import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProblemDetailClient } from "@/components/judge/problem-detail-client";
import { getProblem } from "@/lib/server/domains/judge";
import { MockApiError } from "@/lib/api/errors";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";

interface JudgeProblemPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: JudgeProblemPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const problem = await getProblem(id);
    return buildMetadata({ title: problem.title, description: problem.statement.slice(0, 155), path: `/judge/${id}`, keywords: ["coding problem", ...problem.topics], index: true });
  } catch {
    return buildMetadata({ title: "Judge problem", description: "Solve a deterministic coding challenge on Zapsters.", path: `/judge/${id}` });
  }
}

export default async function JudgeProblemPage({
  params,
}: JudgeProblemPageProps) {
  const { id } = await params;
  const problem = await getProblem(id).catch((error: unknown) => {
    if (error instanceof MockApiError && error.status === 404) notFound();
    throw error;
  });

  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "TechArticle", headline: problem.title, description: problem.statement.slice(0, 155), isPartOf: { "@type": "WebSite", name: "Zapsters" } }} /><div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8"><Breadcrumbs items={[{ label: "Judge", href: "/judge" }, { label: problem.title }]} /></div><ProblemDetailClient problemId={id} initialProblem={problem} /></>;
}
