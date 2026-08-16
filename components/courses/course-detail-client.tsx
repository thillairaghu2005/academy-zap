"use client";

import * as React from "react";
import Link from "next/link";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  Globe,
  GraduationCap,
  Hourglass,
  LoaderCircle,
  Lock,
  MessageCircle,
  Eye,
  PlayCircle,
  Star,
  Users,
} from "lucide-react";

import type { Course, CourseLesson } from "@/lib/contracts/content";
import {
  enroll,
  getCourseProgress,
  getLessonPreview,
  type CourseProgress,
} from "@/lib/data/demo/content";
import { getCourseReviews } from "@/lib/data/demo/reviews";
import { hasEntitlement } from "@/lib/data/demo/commerce";
import { AddToCartButton } from "@/components/commerce/add-to-cart-button";
import { BuyNowButton } from "@/components/commerce/buy-now-button";
import { hueForId } from "@/lib/visual";
import { useSession } from "@/components/providers/session-provider";
import { AUTH_MODE } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { PageContainer } from "@/components/shared/page-container";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { formatReviewDate } from "@/lib/format";
import { InstructorCard } from "@/components/courses/instructor-card";
import { CourseTrustPanel } from "@/components/courses/course-trust-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function coverGradient(hue: number): string {
  void hue;
  return "linear-gradient(135deg, var(--color-primary-light), var(--color-surface-3))";
}


function LessonRow({
  lesson,
  completed,
  index,
  onPreview,
}: {
  lesson: CourseLesson;
  completed: boolean;
  index: number;
  onPreview?: () => void;
}) {
  const content = (
    <>
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border text-caption font-medium",
          completed
            ? "border-transparent bg-success/15 text-success-strong"
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
      {lesson.isPreview ? (
        <Badge variant="info" className="text-caption">
          <Eye className="size-3" /> Preview
        </Badge>
      ) : null}
    </>
  );
  const className = cn(
    "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
    onPreview ? "cursor-pointer hover:bg-accent/60" : "",
  );
  return onPreview ? (
    <button type="button" onClick={onPreview} className={className}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

function PreviewLessonDialog({
  courseId,
  lesson,
  open,
  onOpenChange,
}: {
  courseId: string;
  lesson: CourseLesson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const previewQuery = useQuery({
    queryKey: ["lesson-preview", lesson?.id],
    queryFn: () => getLessonPreview(lesson?.id ?? ""),
    enabled: open && Boolean(lesson),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lesson?.title ?? "Lesson preview"}</DialogTitle>
          <DialogDescription>
            A free preview from this course. Sign in to keep learning beyond this lesson.
          </DialogDescription>
        </DialogHeader>
        {previewQuery.isLoading ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Loading preview…
          </div>
        ) : previewQuery.isError ? (
          <p className="rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
            This preview is temporarily unavailable.
          </p>
        ) : previewQuery.data ? (
          <div className="flex flex-col gap-4">
            {previewQuery.data.manifest_url ? (
              <video
                controls
                preload="metadata"
                className="aspect-video w-full rounded-lg bg-foreground object-cover"
                src={previewQuery.data.manifest_url}
              />
            ) : null}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {previewQuery.data.body}
              </p>
            </div>
            <Button variant="gradient" asChild>
              <Link href={`/login?next=/courses/${courseId}`}>
                Sign in to continue learning <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function CourseDetailClient({
  course,
  previewMode = false,
}: {
  course: Course;
  /** F7 draft preview — renders unpublished content without enroll CTAs. */
  previewMode?: boolean;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const isEnrolledUser = Boolean(user);
  const isFree = course.price_cents === 0;
  // Unpublished courses (draft / in_review) are never enrollable — the
  // preview shows the content exactly as an author/reviewer would see it.
  const isPublished = course.status === "published";
  const isPreview = previewMode || !isPublished;

  const allLessons = course.syllabus.flatMap((section) => section.lessons);

  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressError,
  } = useQuery({
    queryKey: ["course-progress", course.id, userId],
    queryFn: () => getCourseProgress(course.id, userId),
    enabled: isEnrolledUser && isPublished,
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
    queryFn: () => AUTH_MODE === "demo" && hasEntitlement(userId, course.id),
    enabled: isEnrolledUser && !isFree && isPublished,
  });
  const owned = ownedQuery.data ?? false;

  const enrollment = progress?.enrollment ?? null;
  const completedSet = new Set(progress?.completed_lesson_ids ?? []);
  const completedCount = allLessons.filter((l) => completedSet.has(l.id)).length;
  const isDraft = course.status === "draft";
  const [previewLesson, setPreviewLesson] = React.useState<CourseLesson | null>(null);
  const reviewsQuery = useInfiniteQuery({
    queryKey: ["course-reviews", course.id],
    queryFn: ({ pageParam }) => getCourseReviews(course.id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.has_more
        ? lastPage.offset + lastPage.reviews.length
        : undefined,
  });
  const reviewRows = reviewsQuery.data?.pages.flatMap((page) => page.reviews) ?? [];

  return (
    <PageContainer className="max-w-7xl">
      {/* Back link */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/25 hover:text-primary"
      >
        <ArrowRight className="size-4 rotate-180" />
        Back to catalog
      </Link>

      {/* Preview banner — unpublished courses are reachable by id (author/
          reviewer preview); the CTA is replaced with a read-only note. */}
      {isPreview ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-warning/20 text-warning-strong">
            <Clock className="size-3" />
          </span>
          <div className="text-sm">
            <p className="font-medium text-warning-strong">
              {isDraft
                ? "Draft course — author preview"
                : previewMode
                  ? "In review — reviewer preview"
                  : "Unpublished course — preview"}
            </p>
            <p className="text-muted-foreground">
              This course is not published and won&apos;t appear in the catalog.
              You reached it via direct link or the admin preview button.
            </p>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
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

           <h1 className="max-w-4xl font-display text-h1 tracking-[-0.05em]">
            {course.title}
          </h1>
          <p className="text-lg text-muted-foreground">{course.subtitle}</p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
               <Star className="size-4 fill-primary text-primary" />
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
             <div className="grid size-10 place-items-center rounded-full bg-primary/10 font-display text-small font-bold text-primary ring-4 ring-primary/5">
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
             <h2 className="font-display text-h2">
               About this course
             </h2>
             <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
               {course.description}
             </p>
           </div>
           <section
             aria-labelledby="course-outcome-title"
             className="mt-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5"
           >
             <div className="flex flex-wrap items-end justify-between gap-3">
               <div>
                 <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary">The working loop</p>
                 <h2 id="course-outcome-title" className="mt-1 font-display text-xl font-semibold tracking-[-0.025em]">Learn it. Use it. Prove it.</h2>
               </div>
               <Button variant="outline" size="sm" asChild>
                 <Link href="/dashboard#next-move">Build your path <ArrowRight /></Link>
               </Button>
             </div>
             <div className="mt-4 grid gap-2 sm:grid-cols-3">
               <div className="rounded-xl border border-primary/10 bg-card p-3">
                 <BookOpen className="size-4 text-primary" aria-hidden="true" />
                 <p className="mt-2 text-sm font-semibold">Learn</p>
                 <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Short lessons turn the concept into a usable mental model.</p>
               </div>
               <div className="rounded-xl border border-primary/10 bg-card p-3">
                 <FlaskConical className="size-4 text-primary" aria-hidden="true" />
                 <p className="mt-2 text-sm font-semibold">Practice</p>
                 <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Hands-on prompts make the tradeoffs visible before they matter.</p>
               </div>
               <div className="rounded-xl border border-primary/10 bg-card p-3">
                 <CheckCircle2 className="size-4 text-success-strong" aria-hidden="true" />
                 <p className="mt-2 text-sm font-semibold">Prove</p>
                 <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Verified work becomes evidence you can return to and share.</p>
               </div>
             </div>
           </section>
           <CourseTrustPanel courseId={course.id} />
        </div>

        {/* CTA card */}
        <div className="sticky top-20 z-20 self-start lg:top-24">
           <Card variant="glow" className="overflow-hidden rounded-3xl border-primary/10 shadow-[0_18px_50px_rgb(17_24_39_/_10%)]">
            <div
              className="relative h-36 w-full"
              style={{ background: coverGradient(hueForId(course.id)) }}
            >
               <div className="absolute inset-0 bg-primary-muted/70" />
              {enrollment ? (
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-xs font-medium text-white/80">Your progress</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress
                      value={enrollment.progress_pct}
                       className="h-1.5 bg-primary/15"
                       indicatorClassName="bg-primary"
                    />
                     <span className="text-xs font-semibold text-foreground">
                      {enrollment.progress_pct}%
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <CardContent className="flex flex-col gap-4 p-5">
               <div className="flex items-baseline justify-between border-b border-border pb-4">
                <span className="font-display text-h2">
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
                    <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm font-medium text-success-strong">
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
              ) : isPreview ? (
                <Button disabled className="w-full">
                  {isDraft
                    ? "Draft — not enrollable"
                    : "In review — not enrollable"}
                </Button>
              ) : !isFree && !owned ? (
                /* Paid + not owned → entitlement gate: Buy now / Add to cart */
                <div className="flex flex-col gap-2.5">
                  <BuyNowButton productId={course.id} className="w-full" />
                  <AddToCartButton productId={course.id} className="w-full" />
                  <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    <Lock className="mt-0.5 size-3.5 shrink-0 text-warning-strong" />
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

               <div className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-success-strong" />
                  Lifetime access
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-success-strong" />
                  Certificate of completion
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-success-strong" />
                  On-demand video + articles
                </span>
              </div>
            </CardContent>
          </Card>
          <div className="mt-4">
            <InstructorCard instructorId={course.instructor.id} />
          </div>
        </div>
      </div>

      {/* Syllabus */}
      <div className="mt-12">
        <h2 className="font-display text-h2">
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
               <Card key={section.id} variant="glass">
                <CardHeader className="flex flex-row items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-7 place-items-center rounded-md bg-primary/10 font-display text-small font-bold text-primary">
                      {si + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-h3">
                        {section.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {section.lessons.length} lessons
                      </p>
                    </div>
                  </div>
                  {enrollment && sectionCompleted > 0 ? (
                    <Badge variant="success" className="text-caption">
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
                       onPreview={
                         lesson.isPreview
                           ? () => setPreviewLesson(lesson)
                           : undefined
                       }
                     />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <PreviewLessonDialog
        courseId={course.id}
        lesson={previewLesson}
        open={Boolean(previewLesson)}
        onOpenChange={(open) => {
          if (!open) setPreviewLesson(null);
        }}
      />

      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <MessageCircle className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-h3">Stuck? Talk to a mentor</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Get practical guidance from someone who works in the field.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/mentors">
              Browse mentors <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mt-12">
        <h2 className="font-display text-h2">Discussion</h2>
        <div className="mt-4">
          <EmptyState
            icon={MessageCircle}
            title="No discussion posts yet"
            description="Be part of the first conversation around this course. Keep questions close to the lesson where they came up."
            primaryAction={<Button size="sm" asChild><Link href={`/courses/${course.id}/learn`}>Open course lessons</Link></Button>}
            secondaryAction={<Button size="sm" variant="outline" asChild><Link href="/support/new">Ask support</Link></Button>}
          />
        </div>
      </div>

      {/* Reviews are a paged Content Engine projection. */}
      <div className="mt-12">
        <h2 className="font-display text-h2">
          Reviews
        </h2>
         <div className="mt-4 flex flex-col items-start gap-6 rounded-2xl border border-border bg-surface-1 p-6 sm:flex-row sm:items-start">
          <div className="text-center sm:text-left">
            <p className="font-display text-h1">
              {course.rating > 0 ? course.rating.toFixed(1) : "—"}
            </p>
            <div className="mt-1 flex items-center justify-center gap-0.5 sm:justify-start">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-4",
                    i < Math.round(course.rating)
                       ? "fill-primary text-primary"
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
            {reviewsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading learner reviews…</p>
            ) : reviewRows.length > 0 ? (
              <div className="flex flex-col gap-5">
                {reviewRows.map((review) => (
                  <article key={review.id} className="flex gap-3">
                    <Avatar className="size-9">
                      {review.author.avatar_url ? (
                        <AvatarImage src={review.author.avatar_url} alt="" />
                      ) : null}
                      <AvatarFallback>{initials(review.author.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p className="text-sm font-semibold">{review.author.name}</p>
                        <time className="text-xs text-muted-foreground" dateTime={review.date}>
                          {formatReviewDate(review.date)}
                        </time>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              className={cn(
                                "size-3.5",
                                index < review.rating
                                   ? "fill-primary text-primary"
                                  : "text-muted-foreground/30",
                              )}
                            />
                          ))}
                        </span>
                        <span className="text-caption text-muted-foreground">
                          {review.helpful_count} found this helpful
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {review.comment}
                      </p>
                    </div>
                  </article>
                ))}
                {reviewsQuery.hasNextPage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => void reviewsQuery.fetchNextPage()}
                    disabled={reviewsQuery.isFetchingNextPage}
                  >
                    {reviewsQuery.isFetchingNextPage
                      ? "Loading reviews…"
                      : "Load more reviews"}
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Be the first to review this course once you&apos;ve completed a lesson.
              </p>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
