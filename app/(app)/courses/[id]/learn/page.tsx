import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCourse } from "@/lib/api/content";
import { MockApiError } from "@/lib/api/errors";
import { PlayerClient } from "@/components/courses/player-client";

interface LearnPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Player",
  description: "Video player — signed manifests, captions and progress.",
};

export default async function LearnPage({ params }: LearnPageProps) {
  const { id } = await params;

  let course;
  try {
    course = await getCourse(id);
  } catch (err) {
    if (err instanceof MockApiError && err.status === 404) notFound();
    throw err;
  }

  return <PlayerClient course={course} />;
}
