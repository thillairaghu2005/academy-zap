import type { Metadata } from "next";

import { AssessmentDetailClient } from "@/components/assessments/assessment-detail-client";

interface AssessmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Assessment",
  description:
    "Assessment Engine — question breakdown, attempt policy, and the Start flow.",
};

export default async function AssessmentDetailPage({
  params,
}: AssessmentDetailPageProps) {
  const { id } = await params;
  return <AssessmentDetailClient assessmentId={id} />;
}
