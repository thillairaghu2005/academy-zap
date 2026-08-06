import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getInstructor } from "@/lib/api/instructors";
import { InstructorCard } from "@/components/courses/instructor-card";
import { PageContainer } from "@/components/shared/page-container";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const instructor = await getInstructor(id);
    return buildMetadata({ title: `${instructor.name} · Instructor`, description: instructor.bio, path: `/mentors/${id}`, keywords: instructor.skill_tags });
  } catch { return { title: "Instructor" }; }
}

export default async function MentorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let instructor;
  try { instructor = await getInstructor(id); } catch { notFound(); }
  return <PageContainer narrow><JsonLd data={{ "@context": "https://schema.org", "@type": "Person", name: instructor.name, jobTitle: instructor.role, worksFor: { "@type": "Organization", name: instructor.company }, knowsAbout: instructor.skill_tags }} /><Breadcrumbs items={[{ label: "Courses", href: "/courses" }, { label: "Mentors" }, { label: instructor.name }]} /><div className="mb-6"><p className="text-xs font-medium uppercase tracking-widest text-primary">Instructor profile</p><h1 className="mt-2 font-display text-h1">Learn from the people doing the work.</h1></div><InstructorCard instructorId={instructor.id} initialInstructor={instructor} /></PageContainer>;
}
