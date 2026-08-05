"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  GraduationCap,
  Hourglass,
  LoaderCircle,
  Lock,
  PlayCircle,
  Star,
  Users,
} from "lucide-react";

import type { Course, CourseLesson } from "@/lib/contracts/content";
import {
  enroll,
  getCourseProgress,
  type CourseProgress,
} from "@/lib/api/content";
import { hasEntitlement } from "@/lib/api/commerce";
import { AddToCartButton } from "@/components/commerce/add-to-cart-button";
import { BuyNowButton } from "@/components/commerce/buy-now-button";
import { hueForId } from "@/lib/visual";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageContainer } from "@/components/shared/page-container";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function coverGradient(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${(hue + 60) % 360}, 50%, 30%))`;
}


function LessonRow({
  lesson,
  completed,
  index,
}: {
  lesson: CourseLesson;
  completed: boolean;
  index: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/60">
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-medium",
          completed
            ? "border-transparent bg-success/15 text-success"
            : "border-border text-muted-foreground",
        )}
      >
        {completed ? <Check className="size-3.5" /> : index + 1}
      </span>
      <span
        className={cn(
          "flex-1 text-sm",
          completed ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground",
        )}
      >
        {lesson.title}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {lesson.kind === "article" ? (
          <FileText className="size-3.5" />
        ) : (
          <PlayCircle className="size-3.5" />
        )}
        {lesson.kind === "article" ? (
          `${lesson.duration_seconds} words`
        ) : (
          formatDuration(lesson.duration_seconds)
        )}
      </span>
    </div>
  );
}

export function CourseDetailClient({ course }: { course: Course }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const isEnrolledUser = Boolean(user);
  const isFree = course.price_cents === 0;

  const allLessons = course.syllabus.flatMap((section) => section.lessons);

  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressError,
  } = useQuery({
    queryKey: ["course-progress", course.id, userId],
    queryFn: () => getCourseProgress(course.id, userId),
    enabled: isEnrolledUser,
  });

  const enrollMutation = useMutation({
    mutationFn: () => enroll(course.id, userId),
    onSuccess: (enrollment) => {
      queryClient.setQueryData<CourseProgress>(
        ["course-progress", course.id, userId],
        { enrollment, completed_lesson_ids: [] },
      );
      toast.success("Enrolled! Head to the player to start learning ⚡");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // F6 entitlement gate: paid courses require a purchase (hosted checkout).
  // The mock owns the truth — the client never guesses access.
  const ownedQuery = useQuery({
    queryKey: ["entitlement", course.id, userId],
    queryFn: () => hasEntitlement(userId, course.id),
    enabled: isEnrolledUser && !isFree,
  });
  const owned = ownedQuery.data ?? false;

  const enrollment = progress?.enrollment ?? null;
  const completedSet = new Set(progress?.completed_lesson_ids ?? []);
  const completedCount = allLessons.filter((l) => completedSet.has(l.id)).length;
  const isDraft = course.status === "draft";

  return (
    <PageContainer className="max-w-5xl">
      {/* Back link */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="size-4 rotate-180" />
        Back to catalog
      </Link>

      {/* Draft banner (mock: draft courses are reachable by id, excluded from catalog) */}
      {isDraft ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-warning/20 text-warning">
            <Clock className="size-3" />
          </span>
          <div className="text-sm">
            <p className="font-medium text-warning">Draft course — author preview</p>
            <p className="text-muted-foreground">
              This course is not published and won&apos;t appear in the catalog. You
              reached it via direct link, as an author preview would.
            </p>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{course.category}</Badge>
            <Badge variant="outline">{course.level}</Badge>
            <Badge variant="outline">
              <Globe className="size-3" />
              {course.language}
            </Badge>
            <Badge variant={isFree ? "success" : "default"}>
              {isFree ? "Free" : `$${(course.price_cents / 100).toFixed(0)}`}
            </Badge>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {course.title}
          </h1>
          <p className="text-lg text-muted-foreground">{course.subtitle}</p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">
                {course.rating > 0 ? course.rating.toFixed(1) : "New"}
              </span>
              {course.review_count > 0 ? (
                <span>({course.review_count.toLocaleString()} reviews)</span>
              ) : null}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" />
              {course.enrolled_count.toLocaleString()} enrolled
            </span>
            <span className="flex items-center gap-1.5">
              <Hourglass className="size-4" />
              {course.estimated_hours}h of content
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="size-4" />
              {course.instructor.title}
            </span>
          </div>

          {/* Instructor */}
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-display text-sm font-bold text-white">
              {course.instructor.display_name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div>
              <p className="text-sm font-medium">{course.instructor.display_name}</p>
              <p className="text-xs text-muted-foreground">
                {course.instructor.title}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="mt-2">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              About this course
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>
          </div>
        </div>

        {/* CTA card */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div
              className="relative h-36 w-full"
              style={{ background: coverGradient(hueForId(course.id)) }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              {enrollment ? (
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-xs font-medium text-white/80">Your progress</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress
                      value={enrollment.progress_pct}
                      className="h-1.5 bg-black/30"
                      indicatorClassName="bg-white"
                    />
                    <span className="text-xs font-semibold text-white">
                      {enrollment.progress_pct}%
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-3xl font-bold">
                  {isFree ? "Free" : `$${(course.price_cents / 100).toFixed(0)}`}
                </span>
                {!isFree ? (
                  <span className="text-xs text-muted-foreground">
                    one-time · 30-day refund
                  </span>
                ) : null}
              </div>

              {!isEnrolledUser ? (
                <Button variant="gradient" asChild className="w-full">
                  <Link href={`/login?next=/courses/${course.id}`}>
                    Sign in to enroll
                  </Link>
                </Button>
              ) : progressLoading || (ownedQuery.isLoading && !isFree) ? (
                <Button variant="gradient" disabled className="w-full">
                  <LoaderCircle className="animate-spin" />
                  Checking access…
                </Button>
              ) : progressError || (ownedQuery.isError && !isFree) ? (
                <ErrorState
                  title="Couldn't check your access"
                  message="Refresh to retry."
                  className="px-4 py-6"
                />
              ) : enrollment ? (
                <>
                  {enrollment.status === "completed" ? (
                    <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm font-medium text-success">
                      <CheckCircle2 className="size-4" />
                      Course completed — great climb!
                    </div>
                  ) : null}
                  <Button asChild className="w-full">
                    <Link href={`/courses/${course.id}/learn`}>
                      {enrollment.progress_pct > 0
                        ? "Continue learning"
                        : "Start course"}
                      <ArrowRight />
                    </Link>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {completedCount} of {allLessons.length} lessons complete
                  </p>
                </>
              ) : isDraft ? (
                <Button disabled className="w-full">
                  Draft — not enrollable
                </Button>
              ) : !isFree && !owned ? (
                /* Paid + not owned → entitlement gate: Buy now / Add to cart */
                <div className="flex flex-col gap-2.5">
                  <BuyNowButton productId={course.id} className="w-full" />
                  <AddToCartButton productId={course.id} className="w-full" />
                  <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    <Lock className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    You don&apos;t have access yet. Payment happens on the
                    provider&apos;s hosted page — no card data touches Zapsters.
                  </p>
                </div>
              ) : (
                <Button
                  variant="gradient"
                  className="w-full"
                  disabled={enrollMutation.isPending}
                  onClick={() => enrollMutation.mutate()}
                >
                  {enrollMutation.isPending ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Enrolling…
                    </>
                  ) : isFree ? (
                    <>
                      Enroll for free
                      <ArrowRight />
                    </>
                  ) : (
                    <>
                      Enroll now
                      <ArrowRight />
                    </>
                  )}
                </Button>
              )}

              {enrollment ? (
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/courses/${course.id}/learn`}>
                    <BookOpen className="size-4" />
                    Open syllabus view
                  </Link>
                </Button>
              ) : null}

              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-success" />
                  Lifetime access
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-success" />
                  Certificate of completion
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-success" />
                  On-demand video + articles
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Syllabus */}
      <div className="mt-12">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Course content
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {course.syllabus.length} sections · {allLessons.length} lessons ·{" "}
          {formatDuration(
            allLessons.reduce((sum, l) => sum + l.duration_seconds, 0),
          )}
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {course.syllabus.map((section, si) => {
            const sectionCompleted = section.lessons.filter(
              (l) => completedSet.has(l.id),
            ).length;
            return (
              <Card key={section.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-7 place-items-center rounded-md bg-primary/10 font-display text-sm font-bold text-primary">
                      {si + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-sm font-semibold">
                        {section.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {section.lessons.length} lessons
                      </p>
                    </div>
                  </div>
                  {enrollment && sectionCompleted > 0 ? (
                    <Badge variant="success" className="text-[10px]">
                      {sectionCompleted}/{section.lessons.length}
                    </Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  {section.lessons.map((lesson, li) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      index={li}
                      completed={completedSet.has(lesson.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Reviews placeholder — real reviews land with the Content backend */}
      <div className="mt-12">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Reviews
        </h2>
        <div className="mt-4 flex flex-col items-start gap-6 rounded-xl border border-dashed border-border bg-card/40 p-6 sm:flex-row sm:items-center">
          <div className="text-center sm:text-left">
            <p className="font-display text-5xl font-bold">
              {course.rating > 0 ? course.rating.toFixed(1) : "—"}
            </p>
            <div className="mt-1 flex items-center justify-center gap-0.5 sm:justify-start">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-4",
                    i < Math.round(course.rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30",
                  )}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {course.review_count > 0
                ? `${course.review_count.toLocaleString()} reviews`
                : "No reviews yet"}
            </p>
          </div>
          <div className="flex-1 border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {course.review_count > 0
                ? "Learner reviews will render here once the Content Engine review API lands."
                : "Be the first to review this course once you've completed a lesson."}
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
