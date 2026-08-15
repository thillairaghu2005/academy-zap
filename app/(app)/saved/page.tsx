import type { Metadata } from "next";

import { SavedContent } from "@/components/courses/saved-content";
import { searchCatalog } from "@/lib/data/demo/content";
import type { CourseSummary } from "@/lib/contracts/content";

export const metadata: Metadata = {
  title: "Saved",
  description: "Your saved Zapsters courses and labs.",
};

export default async function SavedPage() {
  let courses: CourseSummary[] = [];
  let catalogUnavailable = false;

  try {
    const catalog = await searchCatalog({ page: 1, pageSize: 50 });
    courses = catalog.hits;
  } catch (error) {
    catalogUnavailable = true;
    console.error("[saved-catalog] request failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return <SavedContent courses={courses} catalogUnavailable={catalogUnavailable} />;
}
