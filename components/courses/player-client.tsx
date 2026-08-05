"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Captions,
  CaptionsOff,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Gauge,
  LoaderCircle,
  PlayCircle,
} from "lucide-react";

import type { Course, CourseLesson } from "@/lib/contracts/content";
import {
  getCourseProgress,
  getPlaybackManifest,
  recordProgress,
} from "@/lib/api/content";
import { MockApiError } from "@/lib/api/errors";
import { useSession } from "@/components/providers/session-provider";
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

/** Mock article body — real article content ships with the Content backend. */
function ArticleBody({ lesson }: { lesson: CourseLesson }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="size-4" />
        Article lesson · ~{lesson.duration_seconds} words · 5 min read
      </div>
      <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
        {lesson.title}
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        This is a placeholder article body rendered for the lesson type. In
        the real Content Engine this text ships as authored markdown with the
        course payload — the same contract, no client-side mockery.
      </p>
      <div className="mt-4 rounded-md border border-border bg-secondary/40 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
        $ python3 -c &quot;print(&apos;mock content payload&apos;)&quot;
        <br />
        mock content payload
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Reading an article counts toward course progress the same way a video
        does — completing it is recorded through the same{" "}
        <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">
          recordProgress
        </code>{" "}
        mock API the player uses.
      </p>
    </div>
  );
}

export function PlayerClient({ course }: { course: Course }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const allLessons = course.syllabus.flatMap((section) => section.lessons);
  // Only the user's explicit picks live in state — the resume lesson and the
  // first lesson are derived, so no effect is needed to sync them.
  const [pickedLessonId, setPickedLessonId] = React.useState<string | null>(null);

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

  const isVideo = activeLesson?.kind === "video";

  // Signed manifest for the active video lesson (never for articles). An
  // expired manifest surfaces as a mock 403 (manifest_expired) — the same
  // error the player would see from a real CDN.
  const manifestQuery = useQuery({
    queryKey: ["manifest", activeLessonId, userId],
    queryFn: () => getPlaybackManifest(activeLessonId!, userId),
    enabled: Boolean(userId) && isVideo && Boolean(activeLessonId),
  });

  const manifest = manifestQuery.data;
  const manifestExpired =
    manifestQuery.error instanceof MockApiError &&
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
      // the sidebar checkmarks/counters) reflects the write. The mock API
      // derives progress server-side; components never compute it.
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
      progressMutation.mutate({ lessonId: activeLesson.id, completed: true });
    }
  };

  const isActiveCompleted = activeLesson ? completedSet.has(activeLesson.id) : false;

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
    // Toggle the first text track if the player exposes one.
    const p = playerRef.current as (typeof playerRef.current) & {
      textTracks?: () => { length: number };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const track = (p as any)?.textTracks?.()?.[0];
    if (track) {
      track.mode = captionsOn ? "hidden" : "showing";
    }
  };

  const resumeSeconds =
    enrollment && enrollment.last_lesson_id === activeLesson?.id
      ? enrollment.last_position_seconds
      : 0;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Player top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card/60 px-4 py-3 sm:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/courses/${course.id}`}>
            <ArrowLeft />
            Course
          </Link>
        </Button>
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
        <div className="flex-1 p-4 sm:p-6">
          {progressLoading ? (
            <PlayerSkeleton />
          ) : progressError ? (
            <ErrorState
              title="Couldn't load your progress"
              message="Refresh to retry."
              code="PROGRESS_ERR"
            />
          ) : !isVideo ? (
            activeLesson ? (
              <div className="flex flex-col gap-4">
                <ArticleBody lesson={activeLesson} />
                <MarkCompleteButton
                  completed={isActiveCompleted}
                  pending={progressMutation.isPending}
                  onComplete={() =>
                    progressMutation.mutate({
                      lessonId: activeLesson.id,
                      completed: !isActiveCompleted,
                    })
                  }
                />
              </div>
            ) : null
          ) : manifestQuery.isLoading ? (
            <PlayerSkeleton />
          ) : manifestExpired ? (
            <ErrorState
              title="Signed manifest expired"
              message="The media URL signature has expired (403 from the CDN). In production the player refetches a fresh signed URL; the mock returns a 403 to demo this exact state."
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
                  {new Date(manifest.expires_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
                        completed: !isActiveCompleted,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Lesson sidebar */}
        <aside className="w-full border-t border-border bg-card/40 lg:w-80 lg:shrink-0 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-semibold">Course content</h2>
            <span className="text-xs text-muted-foreground">
              {completedSet.size}/{allLessons.length} done
            </span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-2 pb-4 lg:max-h-[calc(100vh-8rem)]">
            {course.syllabus.map((section) => {
              const sectionDone = section.lessons.filter((l) =>
                completedSet.has(l.id),
              ).length;
              return (
                <div key={section.id} className="mb-3">
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent/60"
                    type="button"
                    aria-label={`${section.title} (collapsed)`}
                  >
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate text-xs font-medium">
                      {section.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {sectionDone}/{section.lessons.length}
                    </span>
                  </button>
                  <div className="mt-1 flex flex-col gap-0.5">
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
                              "grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-medium",
                              done
                                ? "border-transparent bg-success/15 text-success"
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
                          <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
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
