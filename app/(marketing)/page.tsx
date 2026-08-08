import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";
import { searchCatalog } from "@/lib/data/demo/content";

export const metadata: Metadata = {
  title: "Learn. Build. Climb.",
  description:
    "Build practical skills through courses, coding challenges, virtual labs, and progression that keeps you moving.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default async function MarketingHomePage() {
  const catalog = await searchCatalog({ page: 1, pageSize: 50 });
  return <LandingPage courses={catalog.hits} />;
}
