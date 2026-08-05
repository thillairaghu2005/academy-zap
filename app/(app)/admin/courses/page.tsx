import type { Metadata } from "next";

import { AdminCoursesClient } from "@/components/admin/courses-client";

export const metadata: Metadata = {
  title: "Admin · Courses",
  description: "Author, review and publish courses.",
};

export default function AdminCoursesPage() {
  return <AdminCoursesClient />;
}
