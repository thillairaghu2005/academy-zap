import type { Metadata } from "next";

import { CourseForm } from "@/components/admin/course-form";

export const metadata: Metadata = {
  title: "Admin · New course",
  description: "Author a new course (draft).",
};

export default function NewCoursePage() {
  return <CourseForm />;
}
