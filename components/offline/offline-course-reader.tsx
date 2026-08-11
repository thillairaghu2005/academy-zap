"use client";

import * as React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import {
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  LoaderCircle,
  WifiOff,
} from "lucide-react";

import type { Course, CourseLesson } from "@/lib/contracts/content";
import { getCachedCourseOffline } from "@/lib/offline/course-cache";
import { useAnnounce } from "@/components/providers/live-region-provider";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";
import { cn } from "@/lib/utils";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Offline course reader — renders the cached course syllabus + article bodies
 * entirely from IndexedDB (lib/demo/idb.ts), with zero network. Works fully
 * disconnected; the top nav shows the offline pill while disconnected.
 */
export function OfflineCourseReader({ courseId }: { courseId: string }) {
  const announce = useAnnounce();
  const [state, setState] = React.useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; course: Course; cachedAt: string }
  >({ status: "loading" });
  const [activeLessonId, setActiveLessonId] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let cancelled = false;
    void getCachedCourseOffline(courseId).then((record) => {
      if (cancelled) return;
      if (!record) {
        setState({
          status: "error",
          message:
            "This course was not saved on this device. Go online, open the course, and tap “Save offline”.",
        });
        return;
      }
      announce("Course loaded from offline storage");
      setState({
        status: "ready",
        course: record.course,
        cachedAt: record.cached_at,
      });
      setActiveLessonId(record.course.syllabus[0]?.lessons[0]?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, announce]);

  if (state.status === "loading") {
    return (
      <PageContainer className="flex min-h-[60dvh] items-center justify-center">
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading offline copy…
        </p>
      </PageContainer>
    );
  }

  if (state.status === "error") {
    return (
      <PageContainer narrow>
        <ErrorState
          title="No offline copy of this course"
          message={state.message}
          code="OFFLINE_MISSING"
        />
        <div className="mt-4 flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/offline">View saved courses</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  const { course, cachedAt } = state;
  const allLessons = course.syllabus.flatMap((section) => section.lessons);
  const activeLesson =
    allLessons.find((lesson) => lesson.id === activeLessonId) ?? allLessons[0];

  return (
    <PageContainer className="pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-warning-strong">
            <WifiOff className="size-3.5" />
            Offline copy · cached {new Date(cachedAt).toLocaleString()}
          </p>
          <h1 className="mt-2 font-display text-h1">{course.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {course.syllabus.length} sections · {allLessons.length} lessons ·
            read from this device
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/offline">All saved courses</Link>
        </Button>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Article body */}
        <div className="min-w-0">
          {activeLesson ? (
            <ArticleCard lesson={activeLesson} course={course} />
          ) : (
            <p className="text-sm text-muted-foreground">
              This course has no lessons saved.
            </p>
          )}
        </div>

        {/* Syllabus */}
        <aside className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Course content</h2>
          <div className="mt-3 flex flex-col gap-1">
            {course.syllabus.map((section) => {
              const isCollapsed = collapsed[section.id] === true;
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() =>
                      setCollapsed((current) => ({
                        ...current,
                        [section.id]: !isCollapsed,
                      }))
                    }
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium hover:bg-accent/60"
                  >
                    <ChevronDown
                      className={cn(
                        "size-3.5 text-muted-foreground transition-transform",
                        isCollapsed && "-rotate-90",
                      )}
                    />
                    <span className="flex-1 truncate">{section.title}</span>
                  </button>
                  {!isCollapsed ? (
                    <div className="mt-0.5 flex flex-col gap-0.5">
                      {section.lessons.map((lesson) => {
                        const active = lesson.id === activeLesson?.id;
                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => setActiveLessonId(lesson.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-5 shrink-0 place-items-center rounded-full border",
                                active
                                  ? "border-primary/40 text-primary"
                                  : "border-border text-muted-foreground",
                              )}
                            >
                              {lesson.kind === "article" ? (
                                <FileText className="size-3" />
                              ) : (
                                <span className="text-caption">
                                  {formatClock(lesson.duration_seconds)}
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {lesson.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}

function ArticleCard({ lesson, course }: { lesson: CourseLesson; course: Course }) {
  const body = lesson.preview_body?.trim() || `## ${lesson.title}

This lesson is available offline as part of your saved course. Review the idea, write down one practical takeaway, and return online when you are ready to continue with video content.

### Offline study checklist

- Read the lesson summary.
- Capture one useful example in your notes.
- Mark the next online session you want to complete.`;
  return (
    <article className="rounded-3xl border border-border bg-card p-6 sm:p-10">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <BookOpen className="size-4" />
        <span>{course.title}</span>
        <span className="text-border">/</span>
        <span>{lesson.title}</span>
      </div>
      <h2 className="mt-4 font-display text-h2">{lesson.title}</h2>
      <div className="prose prose-slate mt-5 max-w-none text-sm leading-7 text-muted-foreground [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:my-1 [&_strong]:text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{body}</ReactMarkdown>
      </div>
      <div className="mt-6 flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-xs text-success-strong">
        <Check className="size-4" />
        Readable without a connection — no network was used to render this
        page.
      </div>
    </article>
  );
}
