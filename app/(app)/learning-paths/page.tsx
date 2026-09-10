import type { Metadata } from "next";

import { LearningPaths } from "@/components/learning/learning-paths";

export const metadata: Metadata = {
  title: "Learning Paths",
  description: "Structured roadmaps to guide your learning journey from beginner to expert.",
};

export default function LearningPathsPage() {
  return <LearningPaths />;
}
