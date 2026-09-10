import type { Metadata } from "next";

import { Interviews } from "@/components/assessments/interviews";

export const metadata: Metadata = {
  title: "Mock Interviews",
  description: "Practice your interview skills with targeted mock sessions.",
};

export default function InterviewsPage() {
  return <Interviews />;
}
