import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogClient } from "@/components/courses/catalog-client";
import { CourseCatalogLoading } from "@/components/shared/route-loading";
import { searchCatalog } from "@/lib/server/domains/content";
import type { MeilisearchCatalogResponse } from "@/lib/contracts/content";

export const metadata: Metadata = {
  title: "Course catalog",
  description:
    "Content Engine — browse the catalog, search and open a course to learn.",
  alternates: { canonical: "/courses" },
  robots: { index: true, follow: true },
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // CatalogClient reads useSearchParams (URL-synced filters) — it must be
  // inside a Suspense boundary for static prerendering.
  const params = await searchParams;
  const initialData: MeilisearchCatalogResponse | undefined =
    Object.keys(params).length === 0
      ? await searchCatalog({ page: 1, pageSize: 6 })
      : undefined;
  return (
    <Suspense fallback={<CourseCatalogLoading />}>
      <CatalogClient initialData={initialData} />
    </Suspense>
  );
}
