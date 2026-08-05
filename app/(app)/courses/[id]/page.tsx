import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCourse } from "@/lib/api/content";
import { MockApiError } from "@/lib/api/errors";
import { CourseDetailClient } from "@/components/courses/course-detail-client";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Course",
  description: "Course detail — syllabus, enrollment and progress.",
};

export default async function CoursePage({ params }: CoursePageProps) {
  const { id } = await params;

  let course;
  try {
    course = await getCourse(id);
  } catch (err) {
    // Deterministic mock 404 for "missing-course" (detail error state).
    if (err instanceof MockApiError && err.status === 404) notFound();
    throw err;
  }

  return <CourseDetailClient course={course} />;
}
