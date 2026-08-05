import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogClient } from "@/components/courses/catalog-client";

export const metadata: Metadata = {
  title: "Course catalog",
  description:
    "Content Engine — browse the catalog, search and open a course to learn.",
};

export default function CoursesPage() {
  // CatalogClient reads useSearchParams (URL-synced filters) — it must be
  // inside a Suspense boundary for static prerendering.
  return (
    <Suspense>
      <CatalogClient />
    </Suspense>
  );
}
