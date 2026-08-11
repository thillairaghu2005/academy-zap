import type { Metadata } from "next";

import { SavedContent } from "@/components/courses/saved-content";
import { searchCatalog } from "@/lib/data/demo/content";

export const metadata: Metadata = {
  title: "Saved",
  description: "Your saved Zapsters courses and labs.",
};

export default async function SavedPage() {
  const catalog = await searchCatalog({ page: 1, pageSize: 50 });
  return <SavedContent courses={catalog.hits} />;
}
