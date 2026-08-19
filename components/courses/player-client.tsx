"use client";

import * as React from "react";
import { formatLocalTimeMinutes } from "@/lib/format";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bookmark,
  Captions,
  CaptionsOff,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CodeXml,
  Download,
  FileText,
  Gauge,
  Lightbulb,
  LoaderCircle,
  PlayCircle,
  Search,
  StickyNote,
} from "lucide-react";

import type { Course, CourseLesson } from "@/lib/contracts/content";
import {
  getCourseProgress,
  getLessonContent,
  getPlaybackManifest,
  recordProgress,
} from "@/lib/data/demo/content";
import { AUTH_MODE } from "@/lib/config";
import { MockDataError } from "@/lib/data/demo/errors";
import { useSession } from "@/components/providers/session-provider";
import { useAnnounce } from "@/components/providers/live-region-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import {
  cacheCourseForOffline,
  isCourseCached,
} from "@/lib/offline/course-cache";
import {
  getLessonNote,
  isCourseBookmarked,
  saveLessonNote,
  toggleCourseBookmark,
} from "@/lib/demo/course-notes";
import { CertificateDialog } from "@/components/courses/certificate-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// video.js is not SSR-safe — load the wrapper only on the client.
const VideoPlayer = dynamic(
  () => import("@/components/courses/video-player").then((m) => m.VideoPlayer),
  { ssr: false, loading: () => <PlayerSkeleton /> },
);

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PlayerSkeleton() {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-secondary/40">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Authored article body from the Content Engine. */
function ArticleBody({ lesson }: { lesson: CourseLesson }) {
  const body = lesson.preview_body?.trim() || `## ${lesson.title}

This lesson turns the idea into a practical skill. Read the notes below, try the example in your own environment, and finish by marking the lesson complete.

### What to remember

- Start with the smallest useful experiment.
- Observe the result before changing more variables.
- Capture the pattern in your notes so it is easy to reuse.


\`\`\`python
def practice_step(value: str) -> str:
    return f"observed: {value.strip()}"
\`\`\`

The next lesson builds on this foundation with a more realistic scenario.`;
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_10px_30px_rgb(17_24_39_/_5%)] sm:p-10">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="size-4" />
        Article lesson · {lesson.duration_seconds ? `${Math.max(1, Math.round(lesson.duration_seconds / 60))} min read` : "self-paced"}
      </div>
      <h2 className="mt-3 font-display text-h2">
        {lesson.title}
      </h2>
      <div className="prose prose-slate mt-6 max-w-none text-sm leading-7 text-muted-foreground [&_code]:rounded-md [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h3]:mt-7 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:my-1 [&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-border [&_pre]:bg-surface-1 [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-6 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {body}
        </ReactMarkdown>
      </div>
      <div className="mt-7 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Make it stick</p>
        <p className="mt-1 leading-relaxed">Write one observation in your notes, then apply the idea in the next lesson or a Judge challenge.</p>
      </div>
    </div>
  );
}

export function PlayerClient({ course }: { course: Course }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const userId = user?.id ?? "";

  const allLessons = course.syllabus.flatMap((section) => section.lessons);
  // Only the user's explicit picks live in state — the resume lesson and the
  // first lesson are derived, so no effect is needed to sync them.
  const [pickedLessonId, setPickedLessonId] = React.useState<string | null>(null);
  const [offlineSaved, setOfflineSaved] = React.useState(false);
  const [offlineSaving, setOfflineSaving] = React.useState(false);
  const [collapsedSections, setCollapsedSections] = React.useState<
    Record<string, boolean>
  >({});
  const [bookmarked, setBookmarked] = React.useState(() =>
    isCourseBookmarked(course.id),
  );
  const [lessonSearch, setLessonSearch] = React.useState("");
  const [certificateOpen, setCertificateOpen] = React.useState(false);
  const [explainOpen, setExplainOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void isCourseCached(course.id).then((cached) => {
      if (!cancelled) setOfflineSaved(cached);
    });
    return () => {
      cancelled = true;
    };
  }, [course.id]);

  const saveForOffline = async () => {
    setOfflineSaving(true);
    try {
      await cacheCourseForOffline(course);
      setOfflineSaved(true);
      announce("Course saved for offline reading");
      toast.success("Course lessons saved for offline reading.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save this course offline.",
      );
    } finally {
      setOfflineSaving(false);
    }
  };

  const handleToggleBookmark = () => {
    const nowBookmarked = toggleCourseBookmark(course.id);
    setBookmarked(nowBookmarked);
    announce(nowBookmarked ? "Course bookmarked" : "Bookmark removed");
    toast(nowBookmarked ? "Course bookmarked ⭐" : "Bookmark removed");
  };

  const filteredLessons = React.useMemo(() => {
    const query = lessonSearch.trim().toLowerCase();
    if (!query) return null;
     const matches = allLessons.reduce((ids, lesson) => {
       if (lesson.title.toLowerCase().includes(query)) ids.add(lesson.id);
       return ids;
     }, new Set<string>());
    return matches.size > 0 ? matches : new Set<string>();
  }, [lessonSearch, allLessons]);
  const hasSearch = filteredLessons !== null;
  const noSearchResults = hasSearch && filteredLessons!.size === 0;

  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressError,
  } = useQuery({
    queryKey: ["course-progress", course.id, userId],
    queryFn: () => getCourseProgress(course.id, userId),
    enabled: Boolean(userId),
  });

  const enrollment = progress?.enrollment ?? null;
  const completedSet = new Set(progress?.completed_lesson_ids ?? []);

  // Effective lesson = explicit pick → resume lesson → first lesson.
  const activeLesson =
    allLessons.find((l) => l.id === pickedLessonId) ??
    allLessons.find((l) => l.id === enrollment?.last_lesson_id) ??
    allLessons[0];
  const activeLessonId = activeLesson?.id ?? null;
  const activeLessonIndex = activeLesson ? allLessons.findIndex((lesson) => lesson.id === activeLesson.id) : -1;
  const previousLesson = activeLessonIndex > 0 ? allLessons[activeLessonIndex - 1] ?? null : null;
  const nextLesson = activeLessonIndex >= 0 && activeLessonIndex < allLessons.length - 1 ? allLessons[activeLessonIndex + 1] ?? null : null;

  const isVideo = activeLesson?.kind === "video";

  // Full lesson content is enrollment-gated on the backend (slice 02 §2) and is never part of
  // the public course payload. In demo mode the mock fixtures already carry the body on the
  // course object, so this fetch only runs in backend mode.
  const lessonContentQuery = useQuery({
    queryKey: ["lesson-content", activeLessonId, userId],
    queryFn: () => getLessonContent(activeLessonId!, userId),
    enabled:
      AUTH_MODE === "backend" &&
      Boolean(userId) &&
      Boolean(activeLessonId) &&
      !isVideo,
  });

  // Signed manifest delivery is deferred for this vertical slice.
  const manifestQuery = useQuery({
    queryKey: ["manifest", activeLessonId, userId],
    queryFn: () => getPlaybackManifest(activeLessonId!, userId),
    enabled: Boolean(userId) && isVideo && Boolean(activeLessonId),
  });

  const manifest = manifestQuery.data;
  const manifestExpired =
    manifestQuery.error instanceof MockDataError &&
    manifestQuery.error.code === "manifest_expired";

  const progressMutation = useMutation({
    mutationFn: (input: {
      lessonId: string;
      positionSeconds?: number;
      completed: boolean;
    }) =>
      recordProgress({
        courseId: course.id,
        lessonId: input.lessonId,
        userId,
        position_seconds: input.positionSeconds,
        completed: input.completed,
      }),
    onSuccess: (enrollment, input) => {
      // Refetch the progress snapshot so completed_lesson_ids (which drives
      // the sidebar checkmarks/counters) reflects the backend write.
      // derives progress; components never compute it.
      queryClient.invalidateQueries({
        queryKey: ["course-progress", course.id, userId],
      });
      if (input.completed) {
        toast.success("Lesson marked complete ⚡", { position: "top-center" });
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Throttled position reporting while a video plays (~every 10s).
  const lastReportedRef = React.useRef<number>(0);
  const handleTimeUpdate = (seconds: number) => {
    if (seconds - lastReportedRef.current >= 10) {
      lastReportedRef.current = seconds;
      progressMutation.mutate({
        lessonId: activeLesson!.id,
        positionSeconds: seconds,
        completed: false,
      });
    }
  };

  const handleEnded = () => {
    if (activeLesson) {
      progressMutation.mutate({
        lessonId: activeLesson.id,
        positionSeconds: activeLesson.duration_seconds || 1,
        completed: true,
      });
    }
  };

  const isActiveCompleted = activeLesson ? completedSet.has(activeLesson.id) : false;
  const isCourseComplete = enrollment?.status === "completed" ||
    (allLessons.length > 0 && completedSet.size >= allLessons.length);

  // Speed control via the player instance.
  const [speed, setSpeed] = React.useState(1);
  const playerRef = React.useRef<{ playbackRate: (r: number) => void } | null>(null);
  const onPlayerReady = React.useCallback(
    (player: { playbackRate: (r: number) => void }) => {
      playerRef.current = player;
    },
    [],
  );

  const applySpeed = (rate: number) => {
    setSpeed(rate);
    playerRef.current?.playbackRate(rate);
  };

  const [captionsOn, setCaptionsOn] = React.useState(true);
  const toggleCaptions = () => {
    setCaptionsOn((v) => !v);
    // Toggle the first text track if the player exposes one. The video.js
    // player is typed loosely at the ref, so the optional API surface is
    // narrowed here instead of escaping through `any` (audit A4).
    type TextTrackLike = { mode: string };
    const p = playerRef.current as (typeof playerRef.current) & {
      textTracks?: () => TextTrackLike[];
    };
    const track = p?.textTracks?.()?.[0];
    if (track) {
      track.mode = captionsOn ? "hidden" : "showing";
    }
  };

  const resumeSeconds =
    enrollment && enrollment.last_lesson_id === activeLesson?.id
      ? enrollment.last_position_seconds
      : 0;

  return (
    <div className="flex min-h-[calc(100vh-1rem)] flex-col bg-surface-1">
      {/* Player top bar */}
      <div className="frosted chrome-edge-bottom sticky top-0 z-20 flex flex-wrap items-center gap-3 px-4 py-3 shadow-[0_4px_18px_rgb(17_24_39_/_4%)] sm:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/courses/${course.id}`}>
            <ArrowLeft />
            Course
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={saveForOffline}
          disabled={offlineSaving || offlineSaved}
          aria-label={
            offlineSaved
              ? "Course saved for offline reading"
              : "Save course for offline reading"
          }
        >
          <Download />
          {offlineSaving
            ? "Saving..."
            : offlineSaved
              ? "Saved offline"
              : "Save offline"}
        </Button>
        {activeLesson ? <Button variant="ghost" size="sm" onClick={() => setExplainOpen(true)}><Lightbulb /> Explain this</Button> : null}
        {offlineSaved ? (
          <Link
            href={`/offline/course/${encodeURIComponent(course.id)}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            Open offline
          </Link>
        ) : null}
        <Button
          variant={bookmarked ? "secondary" : "outline"}
          size="sm"
          onClick={handleToggleBookmark}
          aria-pressed={bookmarked}
          aria-label={
            bookmarked
              ? "Remove course bookmark"
              : "Bookmark this course"
          }
        >
          <Bookmark className={cn("size-4", bookmarked && "fill-current")} />
          {bookmarked ? "Bookmarked" : "Bookmark"}
        </Button>
        {isCourseComplete ? (
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setCertificateOpen(true)}
          >
            <Award className="size-4" />
            Certificate
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{course.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {activeLesson?.title ?? "Select a lesson"}
          </p>
        </div>
        {enrollment ? (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Progress
              value={enrollment.progress_pct}
              className="h-1.5 w-full sm:w-32"
            />
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {enrollment.progress_pct}%
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Player / article main column */}
        <div className="flex-1 p-4 sm:p-8 lg:p-10">
          <CertificateDialog
            open={certificateOpen}
            onOpenChange={setCertificateOpen}
            course={course}
            learnerName={user?.display_name ?? "Zapster"}
          />
          <Dialog open={explainOpen} onOpenChange={setExplainOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Explain: {activeLesson?.title}</DialogTitle><DialogDescription>A plain-English bridge from the lesson to practical work.</DialogDescription></DialogHeader>
              <div className="grid gap-4 text-sm leading-6"><div className="rounded-xl border border-primary/15 bg-primary/5 p-4"><p className="font-semibold text-foreground">In plain English</p><p className="mt-1 text-muted-foreground">This lesson gives you a repeatable way to turn a large problem into one observable step, one small experiment, and one verified result.</p></div><div><p className="font-semibold">A useful analogy</p><p className="mt-1 text-muted-foreground">Treat the concept like a checklist for a flight: it does not fly the plane for you, but it makes the risky steps visible before you take off.</p></div><div><p className="font-semibold">Try it now</p><p className="mt-1 text-muted-foreground">Write down the input, the expected signal, and one edge case. Then test that edge case in the next lesson or Judge problem.</p></div></div>
            </DialogContent>
          </Dialog>
          {progressLoading ? (
            <PlayerSkeleton />
          ) : progressError ? (
            <ErrorState
              title="Couldn't load your progress"
              message="Refresh to retry."
              code="PROGRESS_ERR"
            />
          ) : !enrollment ? (
            <ErrorState
              title="Enrollment required"
              message="Enroll in this course before opening its lessons."
              code="ENROLLMENT_REQUIRED"
            />
          ) : !isVideo ? (
            activeLesson ? (
              <div className="flex flex-col gap-4">
                {AUTH_MODE === "backend" && lessonContentQuery.isLoading ? (
                  <PlayerSkeleton />
                ) : AUTH_MODE === "backend" && lessonContentQuery.isError ? (
                  <ErrorState
                    title="Lesson unavailable"
                    message={
                      lessonContentQuery.error instanceof Error
                        ? lessonContentQuery.error.message
                        : "This lesson could not be loaded."
                    }
                    code="LESSON_ERR"
                    onRetry={() => lessonContentQuery.refetch()}
                  />
                ) : (
                  <ArticleBody
                    lesson={{
                      ...activeLesson,
                      preview_body:
                        AUTH_MODE === "backend"
                          ? (lessonContentQuery.data?.body ?? null)
                          : activeLesson.preview_body,
                    }}
                  />
                )}
                <MarkCompleteButton
                  completed={isActiveCompleted}
                  pending={progressMutation.isPending}
                  onComplete={() =>
                    progressMutation.mutate({
                      lessonId: activeLesson.id,
                      positionSeconds: !isActiveCompleted
                        ? activeLesson.duration_seconds || 1
                        : 0,
                      completed: !isActiveCompleted,
                    })
                  }
                />
                <LessonNotes
                  key={activeLesson.id}
                  courseId={course.id}
                  lessonId={activeLesson.id}
                  lessonTitle={activeLesson.title}
                />
                <LessonNavigation previous={previousLesson} next={nextLesson} onSelect={setPickedLessonId} />
              </div>
            ) : null
          ) : manifestQuery.isLoading ? (
            <PlayerSkeleton />
          ) : manifestExpired ? (
            <ErrorState
              title="Signed manifest expired"
               message="Signed playback delivery is not enabled in this production slice."
              code="MANIFEST_EXPIRED"
              onRetry={() => manifestQuery.refetch()}
            />
          ) : manifestQuery.isError ? (
            <ErrorState
              title="Manifest unavailable"
              message={
                manifestQuery.error instanceof Error
                  ? manifestQuery.error.message
                  : "The playback manifest could not be fetched."
              }
              code="MANIFEST_ERR"
              onRetry={() => manifestQuery.refetch()}
            />
          ) : manifest ? (
            <div className="flex flex-col gap-3">
              <VideoPlayer
                lessonKey={activeLessonId!}
                manifestUrl={manifest.manifest_url}
                captionsUrl={manifest.captions_url}
                resumeSeconds={resumeSeconds}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onReady={onPlayerReady}
              />

              {/* Player controls strip */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  <span className="hidden sm:inline">Signed manifest · </span>
                  expires{" "}
                  {formatLocalTimeMinutes(manifest.expires_at)}
                </div>

                {manifest.captions_url ? (
                  <Button
                    variant={captionsOn ? "secondary" : "outline"}
                    size="sm"
                    onClick={toggleCaptions}
                    aria-pressed={captionsOn}
                  >
                    {captionsOn ? (
                      <Captions className="size-4" />
                    ) : (
                      <CaptionsOff className="size-4" />
                    )}
                    {captionsOn ? "Captions on" : "Captions off"}
                  </Button>
                ) : null}

                <Select value={speed.toString()} onValueChange={(v) => applySpeed(Number(v))}>
                  <SelectTrigger size="sm" className="w-fit min-w-[86px]">
                    <Gauge className="size-3.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYBACK_RATES.map((rate) => (
                      <SelectItem key={rate} value={rate.toString()}>
                        {rate}×
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="ml-auto">
                  <MarkCompleteButton
                    completed={isActiveCompleted}
                    pending={progressMutation.isPending}
                    onComplete={() =>
                      progressMutation.mutate({
                        lessonId: activeLessonId!,
                        positionSeconds: !isActiveCompleted
                          ? activeLesson?.duration_seconds || 1
                          : 0,
                        completed: !isActiveCompleted,
                      })
                    }
                  />
                </div>
              </div>

              {activeLesson ? (
                <>
                  <LessonNotes
                    key={activeLesson.id}
                    courseId={course.id}
                    lessonId={activeLesson.id}
                    lessonTitle={activeLesson.title}
                   />
                   <LessonNavigation previous={previousLesson} next={nextLesson} onSelect={setPickedLessonId} />
                   <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                     <div className="flex items-start gap-3">
                       <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                         <CodeXml className="size-4" aria-hidden="true" />
                       </span>
                       <div>
                         <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Use this next</p>
                         <p className="mt-1 text-sm font-semibold">Turn this lesson into a practice signal.</p>
                         <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Try one matching Judge problem before the idea gets cold.</p>
                       </div>
                     </div>
                     <Button variant="outline" size="sm" className="shrink-0" asChild>
                       <Link href="/judge">Practice in Judge <ArrowRight /></Link>
                     </Button>
                   </div>
                 </>
              ) : null}
            </div>
          ) : null}
          {isCourseComplete ? <CourseCompletionSummary course={course} lessonCount={allLessons.length} /> : null}
        </div>

        {/* Lesson sidebar */}
        <aside className="w-full border-t border-border bg-white lg:w-96 lg:shrink-0 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Course content</h2>
            <span className="text-xs text-muted-foreground">
              {completedSet.size}/{allLessons.length} done
            </span>
          </div>

          {/* Lesson search (Task 4 — richer course UX) */}
          <div className="border-b border-border px-3 py-2.5">
            <label htmlFor="lesson-search" className="sr-only">
              Search lessons
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="lesson-search"
                value={lessonSearch}
                onChange={(event) => setLessonSearch(event.target.value)}
                placeholder="Search lessons…"
                className="h-9 w-full rounded-md border border-input bg-surface-1 pl-8 pr-3 text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-3 pb-5 lg:max-h-[calc(100vh-6rem)]">
            {noSearchResults ? (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                No lessons match “{lessonSearch.trim()}”.
              </p>
            ) : null}
            {course.syllabus.map((section) => {
              if (hasSearch) {
                const visible = section.lessons.filter((lesson) =>
                  filteredLessons!.has(lesson.id),
                );
                if (visible.length === 0) return null;
                return (
                  <div key={section.id} className="mb-3">
                    <p className="px-2 pb-1 pt-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.title}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {visible.map((lesson) => (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => {
                            setPickedLessonId(lesson.id);
                            setSpeed(1);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                            lesson.id === activeLesson?.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                          )}
                        >
                          <PlayCircle className="size-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">
                            {lesson.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              const sectionDone = section.lessons.filter((l) =>
                completedSet.has(l.id),
              ).length;
              const collapsed = collapsedSections[section.id] === true;
              const sectionContentId = `course-section-${section.id}`;
              return (
                <div key={section.id} className="mb-3">
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent/60"
                    type="button"
                    aria-expanded={!collapsed}
                    aria-controls={sectionContentId}
                    aria-label={`${collapsed ? "Expand" : "Collapse"} ${section.title}`}
                    onClick={() =>
                      setCollapsedSections((current) => ({
                        ...current,
                        [section.id]: !collapsed,
                      }))
                    }
                  >
                    <ChevronDown
                      className={cn(
                        "size-3.5 text-muted-foreground transition-transform",
                        collapsed && "-rotate-90",
                      )}
                    />
                    <span className="flex-1 truncate text-xs font-medium">
                      {section.title}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {sectionDone}/{section.lessons.length}
                    </span>
                  </button>
                  <div
                    id={sectionContentId}
                    hidden={collapsed}
                    className="mt-1 flex flex-col gap-0.5"
                  >
                    {section.lessons.map((lesson, i) => {
                      const active = lesson.id === activeLesson?.id;
                      const done = completedSet.has(lesson.id);
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => {
                            setPickedLessonId(lesson.id);
                            setSpeed(1);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-full border text-caption font-medium",
                              done
                                ? "border-transparent bg-success/15 text-success-strong"
                                : active
                                  ? "border-primary/40 text-primary"
                                  : "border-border text-muted-foreground",
                            )}
                          >
                            {done ? (
                              <Check className="size-3" />
                            ) : (
                              i + 1
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {lesson.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-caption text-muted-foreground">
                            {lesson.kind === "article" ? (
                              <FileText className="size-3" />
                            ) : (
                              <PlayCircle className="size-3" />
                            )}
                            {lesson.kind === "article"
                              ? "read"
                              : formatClock(lesson.duration_seconds)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function LessonNavigation({
  previous,
  next,
  onSelect,
}: {
  previous: CourseLesson | null;
  next: CourseLesson | null;
  onSelect: (lessonId: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
      {previous ? <Button variant="outline" size="sm" onClick={() => onSelect(previous.id)}><ArrowLeft className="size-4" /> Previous</Button> : <span />}
      {next ? <Button size="sm" onClick={() => onSelect(next.id)}>Next lesson <ArrowRight className="size-4" /></Button> : <span className="text-xs font-medium text-success-strong">Course content complete</span>}
    </div>
  );
}

function CourseCompletionSummary({ course, lessonCount }: { course: Course; lessonCount: number }) {
  return (
    <div className="mt-5 rounded-3xl border border-success/20 bg-success/5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-success-strong">Milestone unlocked</p>
          <h2 className="mt-2 font-display text-xl font-semibold">You completed {course.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lessonCount} lessons completed. Your certificate is ready from the top bar.</p>
        </div>
        <CheckCircle2 className="size-7 text-success-strong" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild><Link href="/rank"><Award className="size-4" /> View progress</Link></Button>
        <Button variant="outline" size="sm" asChild><Link href="/courses">Find your next course <ArrowRight className="size-4" /></Link></Button>
      </div>
    </div>
  );
}

function MarkCompleteButton({
  completed,
  pending,
  onComplete,
}: {
  completed: boolean;
  pending: boolean;
  onComplete: () => void;
}) {
  return (
    <Button
      variant={completed ? "outline" : "default"}
      size="sm"
      disabled={pending}
      onClick={onComplete}
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : completed ? (
        <CheckCircle2 className="size-4" />
      ) : (
        <Check className="size-4" />
      )}
      {completed ? "Completed" : "Mark complete"}
    </Button>
  );
}

/** Per-lesson notes panel — persisted per course/lesson in the browser. */
function LessonNotes({
  courseId,
  lessonId,
  lessonTitle,
}: {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
}) {
  const [note, setNote] = React.useState(() => getLessonNote(courseId, lessonId));
  const [saveState, setSaveState] = React.useState<"saved" | "saving">("saved");
  const announce = useAnnounce();
  const savedRef = React.useRef(false);

  // Debounced autosave — writing a note is a local demo write, no server hop.
  React.useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      saveLessonNote(courseId, lessonId, note);
      setSaveState("saved");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [note, courseId, lessonId]);

  const handleSave = () => {
    saveLessonNote(courseId, lessonId, note);
    setSaveState("saved");
    announce("Note saved");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`note-${lessonId}`}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <StickyNote className="size-4 text-primary" />
          My notes
        </label>
        <span className="text-caption text-muted-foreground">
          {lessonTitle}
        </span>
      </div>
      <textarea
        id={`note-${lessonId}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onBlur={handleSave}
        placeholder="Jot down what you want to remember from this lesson…"
        rows={4}
        className="mt-3 w-full resize-y rounded-lg border border-input bg-surface-1 p-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p className="mt-2 flex items-center justify-between text-caption text-muted-foreground">
        <span aria-live="polite">{saveState === "saving" ? "Saving locally..." : "Saved locally in your browser."}</span>
        <span className={cn(note.trim() && "text-success-strong")}>
          {note.trim() ? `${note.trim().split(/\s+/).length} words` : "Empty"}
        </span>
      </p>
    </div>
  );
}
