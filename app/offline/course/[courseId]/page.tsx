import type { Metadata } from "next";

import { OfflineCourseReader } from "@/components/offline/offline-course-reader";

export const metadata: Metadata = {
  title: "Offline course",
  description: "Read a course saved on this device.",
  robots: { index: false, follow: false },
};

export default async function OfflineCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <OfflineCourseReader courseId={courseId} />;
}
