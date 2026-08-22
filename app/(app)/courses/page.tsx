import type { Metadata } from "next";
import { Suspense } from "react";

import { MarketplaceClient } from "@/components/courses/marketplace/marketplace-client";
import { CourseCatalogLoading } from "@/components/shared/route-loading";

export const metadata: Metadata = {
  title: "Course marketplace",
  description:
    "Browse the Zapsters marketplace — curated course collections, hover previews, and instant checkout across security, engineering and AI.",
  alternates: { canonical: "/courses" },
  robots: { index: true, follow: true },
};

export default function CoursesPage() {
  // MarketplaceClient reads useSearchParams (URL-synced search/filters) — it
  // must be inside a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={<CourseCatalogLoading />}>
      <MarketplaceClient />
    </Suspense>
  );
}
