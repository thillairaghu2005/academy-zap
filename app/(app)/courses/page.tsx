import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSurface } from "@/lib/surfaces";
import { SurfaceStub } from "@/components/shared/surface-stub";

export const metadata: Metadata = {
  title: "Courses",
  description: "Content Engine — Udemy-shaped course catalog and player. Landing in F1.",
};

export default function CoursesPage() {
  const surface = getSurface("courses");
  if (!surface) notFound();
  return <SurfaceStub surface={surface} />;
}
