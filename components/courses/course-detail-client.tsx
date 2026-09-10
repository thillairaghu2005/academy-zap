"use client";

import * as React from "react";
import Link from "next/link";
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  Globe,
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
import { CourseReviews } from "@/components/courses/course-reviews";
import { hasEntitlement } from "@/lib/data/demo/commerce";
import { AddToCartButton } from "@/components/commerce/add-to-cart-button";
import { BuyNowButton } from "@/components/commerce/buy-now-button";
import { useSession } from "@/components/providers/session-provider";
import { AUTH_MODE } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Progress } from "@/components/ui/progress";
import { PageContainer } from "@/components/shared/page-container";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

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
              <Link href={`/login?next=${encodeURIComponent(`/courses/${courseId}/learn`)}`}>
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


  return (
    <PageContainer className="max-w-7xl">
      {/* Back link */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/25 hover:text-primary"
      >
        <ArrowLeft className="size-4" />
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
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex flex-col gap-6">
          
          {/* Bento Main Header Card */}
          <div className="flex flex-col gap-4 rounded-[28px] border border-border bg-card p-8 shadow-[0_12px_32px_rgb(17_24_39_/_0.08)]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-muted/50 text-foreground border-transparent">{course.category}</Badge>
              <Badge variant="secondary" className="bg-muted/50 text-foreground border-transparent">{course.level}</Badge>
              <Badge variant="secondary" className="bg-muted/50 text-foreground border-transparent">
                <Globe className="size-3 mr-1" />
                {course.language}
              </Badge>
              <Badge variant="secondary" className={isFree ? "bg-success/10 text-success-strong border-transparent" : "bg-primary/10 text-primary border-transparent"}>
                {isFree ? "Free" : `$${(course.price_cents / 100).toFixed(0)}`}
              </Badge>
            </div>

             <h1 className="max-w-4xl font-display text-h1 tracking-[-0.05em] text-foreground">
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
            </div>

            {/* Instructor Inline */}
            <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-6">
               <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-lg text-primary">
                {course.instructor.display_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{course.instructor.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  {course.instructor.title}
                </p>
              </div>
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
           <div className="flex flex-col gap-6 overflow-hidden rounded-[28px] border border-border bg-card p-6 shadow-[0_12px_32px_rgb(17_24_39_/_0.08)]">
            
            {enrollment ? (
              <div className="mb-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Your progress</p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={enrollment.progress_pct}
                     className="h-2 bg-muted flex-1"
                     indicatorClassName="bg-primary"
                  />
                   <span className="text-xs font-semibold text-foreground">
                    {enrollment.progress_pct}%
                  </span>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-4">
               <div className="flex items-end justify-between border-b border-border/60 pb-4">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Price</span>
                  <span className="font-display text-h2 leading-none">
                    {isFree ? "Free" : `$${(course.price_cents / 100).toFixed(0)}`}
                  </span>
                </div>
                {!isFree ? (
                  <span className="text-[10px] text-muted-foreground mb-1">
                    one-time · 30-day refund
                  </span>
                ) : null}
              </div>

              {!isEnrolledUser ? (
                <Button variant="gradient" asChild className="w-full">
                  <Link href={`/login?next=${encodeURIComponent(`/courses/${course.id}/learn`)}`}>
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
            </div>
           </div>
          <div className="mt-6">
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
               <div key={section.id} className="rounded-[28px] border border-border bg-card shadow-[0_4px_16px_rgb(17_24_39_/_0.04)] overflow-hidden">
                <div className="flex flex-row items-center justify-between gap-3 p-6 pb-4">
                  <div className="flex items-center gap-4">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                      {si + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {section.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {section.lessons.length} lessons
                      </p>
                    </div>
                  </div>
                  {enrollment && sectionCompleted > 0 ? (
                    <Badge variant="secondary" className="bg-success/10 text-success-strong text-caption border-transparent">
                      {sectionCompleted}/{section.lessons.length}
                    </Badge>
                  ) : null}
                </div>
                <div className="p-4 pt-0">
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
                </div>
              </div>
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

      <div className="mt-8 rounded-[28px] border border-primary/20 bg-primary/5 p-6 shadow-[0_4px_16px_rgb(17_24_39_/_0.04)]">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Stuck? Talk to a mentor</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Get practical guidance from someone who works in the field.
              </p>
            </div>
          </div>
          <Button variant="outline" className="rounded-xl h-10 px-6 font-semibold" asChild>
            <Link href="/mentors">
              Browse mentors <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        </div>
      </div>

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
      <CourseReviews courseId={course.id} rating={course.rating} reviewCount={course.review_count} />
    </PageContainer>
  );
}
