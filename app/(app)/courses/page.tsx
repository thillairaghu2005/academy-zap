import type { Metadata } from "next";
import { Suspense } from "react";

import { MarketplaceClient } from "@/components/courses/marketplace/marketplace-client";
import { CourseCatalogLoading } from "@/components/shared/route-loading";

export const metadata: Metadata = {
  title: "Explore Courses",
  description:
    "Explore enterprise technical courses, hands-on virtual labs, role learning pathways, and verified skill credentials across cloud, cyber defense, systems, and AI.",
  alternates: { canonical: "/courses" },
  robots: { index: true, follow: true },
};

export default function CoursesPage() {
  return (
    <Suspense fallback={<CourseCatalogLoading />}>
      <MarketplaceClient />
    </Suspense>
  );
}
