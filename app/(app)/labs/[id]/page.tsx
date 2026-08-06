import type { Metadata } from "next";

import { LabDetailClient } from "@/components/lab/lab-detail-client";
import { getLab } from "@/lib/api/lab";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";

interface LabDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: LabDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try { const lab = await getLab(id); return buildMetadata({ title: lab.title, description: lab.description, path: `/labs/${id}`, keywords: ["virtual lab", lab.category, lab.difficulty] }); }
  catch { return buildMetadata({ title: "Virtual lab", description: "Practice in an isolated Zapsters lab.", path: `/labs/${id}` }); }
}

export default async function LabDetailPage({ params }: LabDetailPageProps) {
  const { id } = await params;
  // Data fetching + all states (loading / 404 / provision) live in the
  // client, mirroring the judge detail pattern.
  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "LearningResource", name: id, learningResourceType: "Virtual lab", provider: { "@type": "Organization", name: "Zapsters" } }} /><div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8"><Breadcrumbs items={[{ label: "Labs", href: "/labs" }, { label: id }]} /></div><LabDetailClient labId={id} /></>;
}
