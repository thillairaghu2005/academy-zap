import type { Metadata } from "next";

import { ProblemDetailClient } from "@/components/judge/problem-detail-client";
import { getProblem } from "@/lib/api/judge";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";

interface JudgeProblemPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: JudgeProblemPageProps): Promise<Metadata> {
  const { id } = await params;
  try { const problem = await getProblem(id); return buildMetadata({ title: problem.title, description: problem.statement.slice(0, 155), path: `/judge/${id}`, keywords: ["coding problem", ...problem.topics] }); }
  catch { return buildMetadata({ title: "Judge problem", description: "Solve a deterministic coding challenge on Zapsters.", path: `/judge/${id}` }); }
}

export default async function JudgeProblemPage({
  params,
}: JudgeProblemPageProps) {
  const { id } = await params;
  // All data fetching + state handling (loading / 404 / verdicts) lives in
  // the client — the Monaco editor forces a client surface anyway.
  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "TechArticle", headline: id, isPartOf: { "@type": "WebSite", name: "Zapsters" } }} /><div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8"><Breadcrumbs items={[{ label: "Judge", href: "/judge" }, { label: id }]} /></div><ProblemDetailClient problemId={id} /></>;
}
