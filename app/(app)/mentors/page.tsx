import type { Metadata } from "next";
import { Users } from "lucide-react";

import { InstructorCard } from "@/components/courses/instructor-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { listInstructors } from "@/lib/api/instructors";

export const metadata: Metadata = {
  title: "Mentors",
  description: "Find experienced practitioners who can help you keep climbing.",
  alternates: { canonical: "/mentors" },
  robots: { index: true, follow: true },
};

export default async function MentorsPage() {
  const mentors = await listInstructors();

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: "Climb" }, { label: "Mentors" }]} />
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Climb with guidance</p>
        <h1 className="mt-2 font-display text-h1">Talk to a mentor</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Ask better questions, unblock your next project, and learn from people doing the work.
        </p>
      </div>

      {mentors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No mentors available yet"
          description="The mentor directory is being prepared. Check back soon or keep learning in the meantime."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {mentors.map((mentor) => (
            <InstructorCard key={mentor.id} instructorId={mentor.id} initialInstructor={mentor} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
