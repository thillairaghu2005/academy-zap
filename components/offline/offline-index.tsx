"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Download, HardDrive, LoaderCircle, Trash2, WifiOff } from "lucide-react";

import { getCachedCourseOffline, listCachedCoursesOffline, removeCachedCourseOffline } from "@/lib/offline/course-cache";
import { useAnnounce } from "@/components/providers/live-region-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";

/**
 * Offline index — every course saved on this device (IndexedDB mirror),
 * with remove controls. Purely client-side reads; no network.
 */
export function OfflineIndex() {
  const announce = useAnnounce();
  const online = useOnlineStatus();
  const [courses, setCourses] = React.useState<
    { course_id: string; cached_at: string; title: string; lessons: number }[] | null
  >(null);
  const [storage, setStorage] = React.useState<{ usage?: number; quota?: number }>({});

  const refresh = React.useCallback(() => {
    void Promise.all([
      listCachedCoursesOffline().then(async (items) => Promise.all(items.map(async (item) => {
        const cached = await getCachedCourseOffline(item.course_id);
        return {
          ...item,
          title: cached?.course.title ?? item.course_id,
          lessons: cached?.course.syllabus.flatMap((section) => section.lessons).length ?? 0,
        };
      }))),
      typeof navigator !== "undefined" && navigator.storage?.estimate ? navigator.storage.estimate() : Promise.resolve({}),
    ]).then(([items, estimate]) => {
      setCourses(items);
      setStorage({
        usage: "usage" in estimate && typeof estimate.usage === "number" ? estimate.usage : undefined,
        quota: "quota" in estimate && typeof estimate.quota === "number" ? estimate.quota : undefined,
      });
    });
  }, []);

  React.useEffect(refresh, [refresh]);

  const remove = (courseId: string) => {
    void removeCachedCourseOffline(courseId).then(() => {
      announce("Offline copy removed");
      refresh();
    });
  };

  return (
    <PageContainer className="flex min-h-[60dvh] flex-col items-center justify-center py-20 text-center">
      <p className="flex items-center gap-2 font-display text-h1">
        {online ? (
          <>
            <WifiOff className="size-8 text-warning-strong" />
            Offline reading
          </>
        ) : (
          <>
            <WifiOff className="size-8 text-warning-strong" />
            You are offline
          </>
        )}
      </p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Courses saved on this device remain readable without a connection.
        {online
          ? " Go online and tap “Save offline” in any course to add more."
          : " Reconnect to save new courses for offline reading."}
      </p>

      <div className="mt-8 w-full max-w-lg">
        {courses === null ? (
          <p role="status" className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Reading offline storage…
          </p>
        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No saved courses"
            description="Open a course while online and tap “Save offline” to keep its syllabus and articles on this device."
            primaryAction={
              <Button variant="gradient" size="sm" asChild>
                <Link href="/courses">
                  <BookOpen className="size-4" />
                  Browse courses
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Saved courses</p><p className="mt-1 font-display text-2xl font-semibold">{courses.length}</p></div>
              <div className="rounded-2xl border border-border bg-card p-4"><p className="flex items-center gap-1 text-xs text-muted-foreground"><HardDrive className="size-3" /> Storage used</p><p className="mt-1 font-display text-2xl font-semibold">{storage.usage ? `${(storage.usage / 1024 / 1024).toFixed(1)} MB` : "Local"}</p>{storage.quota ? <p className="mt-1 text-[10px] text-muted-foreground">of {(storage.quota / 1024 / 1024).toFixed(0)} MB available</p> : null}</div>
            </div>
            <ul className="flex flex-col gap-2 text-left">
            {courses.map((course) => (
              <li
                key={course.course_id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Download className="size-4" />
                </span>
                  <span className="min-w-0 flex-1">
                   <span className="block truncate text-sm font-medium">
                     {course.title}
                   </span>
                   <span className="block text-caption text-muted-foreground">
                     {course.lessons} lessons · Saved {new Date(course.cached_at).toLocaleString()}
                   </span>
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/offline/course/${encodeURIComponent(course.course_id)}`}>
                    Read offline
                  </Link>
                </Button>
                   <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(course.course_id)}
                    aria-label={`Remove offline copy of ${course.course_id}`}
                  >
                   <Trash2 className="size-3.5" />
                   <span className="sr-only">Remove</span>
                  </Button>
              </li>
            ))}
            </ul>
          </>
        )}
      </div>

      <Button variant="ghost" size="sm" asChild className="mt-8">
        <Link href="/courses">Back to courses</Link>
      </Button>
    </PageContainer>
  );
}
