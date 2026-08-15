import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";
import { searchCatalog } from "@/lib/data/demo/content";
import type { CourseSummary } from "@/lib/contracts/content";

export const metadata: Metadata = {
  title: "Learn. Build. Climb.",
  description:
    "Build practical skills through courses, coding challenges, virtual labs, and progression that keeps you moving.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default async function MarketingHomePage() {
  let courses: CourseSummary[] = [];
  let catalogUnavailable = false;

  try {
    const catalog = await searchCatalog({ page: 1, pageSize: 50 });
    courses = catalog.hits;
  } catch (error) {
    catalogUnavailable = true;
    console.error("[public-catalog] request failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return <LandingPage courses={courses} catalogUnavailable={catalogUnavailable} />;
}
