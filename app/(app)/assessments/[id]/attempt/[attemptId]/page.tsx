import type { Metadata } from "next";

import { AssessmentAttemptClient } from "@/components/assessments/attempt-client";

interface AssessmentAttemptPageProps {
  params: Promise<{ id: string; attemptId: string }>;
}

export const metadata: Metadata = {
  title: "Assessment Attempt",
  description:
    "Live timed assessment — question flow, combo meter, and deterministic demo grading.",
};

export default async function AssessmentAttemptPage({
  params,
}: AssessmentAttemptPageProps) {
  const { id, attemptId } = await params;
  return <AssessmentAttemptClient assessmentId={id} attemptId={attemptId} />;
}
