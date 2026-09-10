import type { Metadata } from "next";

import { LearningPathDetail } from "@/components/learning/learning-path-detail";

export const metadata: Metadata = {
  title: "Learning Path",
  description: "Follow the curriculum roadmap to master new skills.",
};

export default async function LearningPathPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <LearningPathDetail id={resolvedParams.id} />;
}
