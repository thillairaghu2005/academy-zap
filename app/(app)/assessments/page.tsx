import type { Metadata } from "next";

import { AssessmentCatalogClient } from "@/components/assessments/catalog-client";

export const metadata: Metadata = {
  title: "Assessments",
  description:
    "Assessment Engine — timed MCQ, short-answer and code checkpoints with a live combo meter.",
};

export default function AssessmentsPage() {
  return <AssessmentCatalogClient />;
}
