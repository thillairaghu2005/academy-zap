import type { Metadata } from "next";
import { Suspense } from "react";

import { LabCatalogClient } from "@/components/lab/catalog-client";

export const metadata: Metadata = {
  title: "Virtual Labs",
  description:
    "Lab Engine — TryHackMe-shaped virtual labs. Provision isolated sandboxes, drive a real terminal, and capture flags.",
};

export default function LabsPage() {
  // LabCatalogClient reads useSearchParams (URL-synced filters) — it must be
  // inside a Suspense boundary for static prerendering (same as /courses).
  return (
    <Suspense>
      <LabCatalogClient />
    </Suspense>
  );
}
