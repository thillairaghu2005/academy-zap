import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCourse } from "@/lib/api/content";
import { MockApiError } from "@/lib/api/errors";
import { CourseDetailClient } from "@/components/courses/course-detail-client";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";

interface CoursePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const course = await getCourse(id);
    return buildMetadata({ title: course.title, description: course.subtitle, path: `/courses/${id}`, keywords: [course.category, course.level, course.instructor.display_name] });
  } catch {
    return buildMetadata({ title: "Course", description: "Explore a practical Zapsters course.", path: `/courses/${id}` });
  }
}

export default async function CoursePage({
  params,
  searchParams,
}: CoursePageProps) {
  const { id } = await params;
  // F7 draft preview — ?preview=1 renders unpublished content read-only.
  const previewMode = (await searchParams).preview === "1";

  let course;
  try {
    course = await getCourse(id);
  } catch (err) {
    // Deterministic mock 404 for "missing-course" (detail error state).
    if (err instanceof MockApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Course", name: course.title, description: course.description, provider: { "@type": "Organization", name: "Zapsters", url: "https://zapsters.dev" }, instructor: { "@type": "Person", name: course.instructor.display_name }, aggregateRating: course.review_count ? { "@type": "AggregateRating", ratingValue: course.rating, reviewCount: course.review_count } : undefined }} />
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8"><Breadcrumbs items={[{ label: "Courses", href: "/courses" }, { label: course.title }]} /></div>
      <CourseDetailClient course={course} previewMode={previewMode} />
    </>
  );
}
