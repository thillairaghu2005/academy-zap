"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Clock3, ExternalLink, FlaskConical } from "lucide-react";
import type { CourseSummary } from "@/lib/contracts/content";
import { listBookmarkedCourseIds, toggleCourseBookmark } from "@/lib/demo/course-notes";
import { listBookmarkedLabIds } from "@/lib/demo/lab-bookmarks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";

export function SavedContent({ courses, catalogUnavailable = false }: { courses: CourseSummary[]; catalogUnavailable?: boolean }) {
  const [savedIds, setSavedIds] = React.useState<string[]>([]);
  const [labIds, setLabIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    React.startTransition(() => {
      setSavedIds(listBookmarkedCourseIds());
      setLabIds(listBookmarkedLabIds());
    });
    const sync = () => { setSavedIds(listBookmarkedCourseIds()); setLabIds(listBookmarkedLabIds()); };
    window.addEventListener("zapsters:demo-state", sync);
    return () => window.removeEventListener("zapsters:demo-state", sync);
  }, []);

  const savedIdSet = new Set(savedIds);
  const savedCourses = courses.filter((course) => savedIdSet.has(course.id));
  const remove = (course: CourseSummary) => {
    toggleCourseBookmark(course.id);
    setSavedIds((current) => current.filter((id) => id !== course.id));
    toast("Course removed from saved", { action: { label: "Undo", onClick: () => { toggleCourseBookmark(course.id); setSavedIds((current) => [...current, course.id]); } } });
  };

  if (catalogUnavailable) {
    return <PageContainer className="pt-8 sm:pt-10"><ErrorState title="Saved courses unavailable" message="The course catalog could not be reached. Retry shortly to request the latest state." /></PageContainer>;
  }

  return <PageContainer className="pt-8 sm:pt-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Your library</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Saved</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Keep lessons, courses, and labs close to the next session.</p></div><span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">{savedCourses.length + labIds.length} saved items</span></div>
    {!savedCourses.length && !labIds.length ? <EmptyState icon={Bookmark} title="Your saved shelf is empty" description="Bookmark a course or lab when you find something worth returning to." primaryAction={<Button asChild><Link href="/courses">Browse courses</Link></Button>} /> : <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{savedCourses.map((course) => <Card key={course.id} className="group p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary-border hover:shadow-[0_8px_24px_rgb(16_24_40_/_6%)]"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BookmarkCheck className="size-5" /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">{course.category}</p><h2 className="mt-1 font-display text-lg font-semibold leading-tight">{course.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{course.subtitle}</p></div></div><div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Clock3 className="size-3.5" />{course.estimated_hours}h</span><span>{course.level}</span><span className="ml-auto">{course.rating.toFixed(1)} rating</span></div><div className="mt-5 flex gap-2 border-t border-border pt-4"><Button size="sm" asChild><Link href={`/courses/${course.id}`}>View course <ExternalLink /></Link></Button><Button size="sm" variant="ghost" onClick={() => remove(course)}>Remove</Button></div></Card>)}{labIds.map((labId) => <Card key={labId} className="p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FlaskConical className="size-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">Saved lab</p><h2 className="mt-1 font-display text-lg font-semibold">Lab workspace</h2><p className="mt-2 text-sm leading-5 text-muted-foreground">Lab {labId.slice(0, 8)} is ready for your next hands-on session.</p></div></div><Button className="mt-5" size="sm" asChild><Link href={`/labs/${labId}`}>Open lab</Link></Button></Card>)}</div>}
  </PageContainer>;
}
