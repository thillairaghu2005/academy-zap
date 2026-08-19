import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NotebookClient } from "@/components/lab/notebook-client";
import { getLab } from "@/lib/data/lab-facade";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { BookOpenText } from "lucide-react";

interface NotebookPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: NotebookPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const lab = await getLab(id);
    return buildMetadata({
      title: `${lab.title} — notebook`,
      description: lab.description,
      path: `/labs/${id}/notebook`,
      keywords: ["virtual lab", lab.category, lab.difficulty],
      index: false,
    });
  } catch {
    return buildMetadata({ title: "Lab notebook", description: "Practice in an isolated Zapsters lab.", path: `/labs/${id}/notebook` });
  }
}

export default async function NotebookPage({ params }: NotebookPageProps) {
  const { id } = await params;
  const lab = await getLab(id).catch((error: unknown) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status: number }).status === 404
    ) {
      notFound();
    }
    throw error;
  });

  if (!lab.notebook) {
    return (
      <PageContainer>
        <Breadcrumbs items={[{ label: "Labs", href: "/labs" }, { label: lab.title, href: `/labs/${lab.id}` }, { label: "Notebook" }]} />
        <div className="mt-8">
          <EmptyState
            icon={BookOpenText}
            title="This lab has no notebook"
            description="This lab runs in a terminal session instead. Start it from the lab page."
            action={
              <Link href={`/labs/${lab.id}`} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                Open lab
              </Link>
            }
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "LearningResource", name: lab.title, description: lab.description, learningResourceType: "Virtual lab notebook", provider: { "@type": "Organization", name: "Zapsters" } }} />
      <NotebookClient labId={lab.slug} initialLab={lab} />
    </>
  );
}
