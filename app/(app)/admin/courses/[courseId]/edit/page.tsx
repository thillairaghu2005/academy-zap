import type { Metadata } from "next";

import { CourseForm } from "@/components/admin/course-form";

export const metadata: Metadata = {
  title: "Admin · Edit course",
  description: "Edit course details.",
};

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseForm courseId={courseId} />;
}
