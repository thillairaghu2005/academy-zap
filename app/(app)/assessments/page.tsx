import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSurface } from "@/lib/surfaces";
import { SurfaceStub } from "@/components/shared/surface-stub";

export const metadata: Metadata = {
  title: "Assessments",
  description: "Assessment Engine — MCQ, short-answer and code questions. Landing in F4.",
};

export default function AssessmentsPage() {
  const surface = getSurface("assessments");
  if (!surface) notFound();
  return <SurfaceStub surface={surface} />;
}
