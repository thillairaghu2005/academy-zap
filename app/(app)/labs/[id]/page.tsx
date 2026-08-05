import type { Metadata } from "next";

import { LabDetailClient } from "@/components/lab/lab-detail-client";

interface LabDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Lab",
  description:
    "Lab Engine — objectives, difficulty, and the Start-Lab provisioning flow.",
};

export default async function LabDetailPage({ params }: LabDetailPageProps) {
  const { id } = await params;
  // Data fetching + all states (loading / 404 / provision) live in the
  // client, mirroring the judge detail pattern.
  return <LabDetailClient labId={id} />;
}
