"use client";

import * as React from "react";
import Link from "next/link";
import {
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
          
          {/* Enterprise Main Header Card */}
          <div className="flex flex-col gap-6 border border-border bg-card p-8 sm:p-10 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-sm bg-muted/30 uppercase tracking-wider text-xs font-semibold">{course.category}</Badge>
              <Badge variant="outline" className="rounded-sm bg-muted/30 uppercase tracking-wider text-xs font-semibold">{course.level}</Badge>
              <Badge variant="outline" className="rounded-sm bg-muted/30 uppercase tracking-wider text-xs font-semibold">
                <Globe className="size-3 mr-1" />
                {course.language}
              </Badge>
              <Badge variant="outline" className={isFree ? "rounded-sm border-success/30 bg-success/10 text-success-strong uppercase tracking-wider text-xs font-semibold" : "rounded-sm border-primary/30 bg-primary/10 text-primary uppercase tracking-wider text-xs font-semibold"}>
                {isFree ? "Free" : `$${(course.price_cents / 100).toFixed(0)}`}
              </Badge>
            </div>

             <h1 className="max-w-4xl font-display text-4xl sm:text-5xl tracking-tight text-foreground font-semibold">
              {course.title}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">{course.subtitle}</p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground border-y border-border/50 py-4 mt-2">
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
            <div className="flex items-center gap-3 mt-2">
               <div className="flex size-10 shrink-0 items-center justify-center bg-primary/10 font-bold text-lg text-primary">
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
             className="mt-6 border border-border bg-card p-6 shadow-sm"
           >
             <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/50 pb-4">
               <div>
                 <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary">The working loop</p>
                 <h2 id="course-outcome-title" className="mt-1 font-display text-xl font-semibold tracking-[-0.025em]">Learn it. Use it. Prove it.</h2>
               </div>
               <Button variant="outline" size="sm" className="rounded-sm" asChild>
                 <Link href="/dashboard#next-move">Build your path <ArrowRight className="ml-1" /></Link>
               </Button>
             </div>
             <div className="mt-6 grid gap-6 sm:grid-cols-3">
               <div className="p-2">
                 <BookOpen className="size-5 text-primary mb-3" aria-hidden="true" />
                 <p className="text-sm font-semibold">Learn</p>
                 <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Short lessons turn the concept into a usable mental model.</p>
               </div>
               <div className="p-2 border-l border-border/50 pl-6">
                 <FlaskConical className="size-5 text-primary mb-3" aria-hidden="true" />
                 <p className="text-sm font-semibold">Practice</p>
                 <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Hands-on prompts make the tradeoffs visible before they matter.</p>
               </div>
               <div className="p-2 border-l border-border/50 pl-6">
                 <CheckCircle2 className="size-5 text-success-strong mb-3" aria-hidden="true" />
                 <p className="text-sm font-semibold">Prove</p>
                 <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Verified work becomes evidence you can return to and share.</p>
               </div>
             </div>
           </section>
        </div>

        {/* CTA card */}
        <div className="sticky top-20 z-20 self-start lg:top-24">
           <div className="flex flex-col gap-6 border border-border bg-card p-6 shadow-sm">
            
            {enrollment ? (
              <div className="mb-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">Your progress</p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={enrollment.progress_pct}
                     className="h-1.5 bg-muted flex-1"
                     indicatorClassName="bg-primary"
                  />
                   <span className="text-xs font-semibold text-foreground">
                    {enrollment.progress_pct}%
                  </span>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-5">
               <div className="flex items-end justify-between border-b border-border/60 pb-5">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Pricing</span>
                  <span className="font-display text-4xl font-semibold leading-none text-foreground">
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
                <Button className="w-full rounded-sm h-12 text-base font-semibold" asChild>
                  <Link href={`/login?next=${encodeURIComponent(`/courses/${course.id}/learn`)}`}>
                    Sign in to enroll
                  </Link>
                </Button>
              ) : progressLoading || (ownedQuery.isLoading && !isFree) ? (
                <Button disabled className="w-full rounded-sm h-12 text-base font-semibold">
                  <LoaderCircle className="animate-spin mr-2" />
                  Checking access…
                </Button>
              ) : progressError || (ownedQuery.isError && !isFree) ? (
                <ErrorState
                  title="Couldn't check your access"
                  message="Refresh to retry."
                  className="px-4 py-6 rounded-sm border-destructive/20"
                />
              ) : enrollment ? (
                <>
                  {enrollment.status === "completed" ? (
                    <div className="flex items-center gap-2 border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success-strong">
                      <CheckCircle2 className="size-4" />
                      Course completed — great climb!
                    </div>
                  ) : null}
                  <Button asChild className="w-full rounded-sm h-12 text-base font-semibold">
                    <Link href={`/courses/${course.id}/learn`}>
                      {enrollment.progress_pct > 0
                        ? "Continue learning"
                        : "Start course"}
                      <ArrowRight className="ml-2" />
                    </Link>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {completedCount} of {allLessons.length} lessons complete
                  </p>
                </>
              ) : isPreview ? (
                <Button disabled className="w-full rounded-sm h-12 text-base font-semibold">
                  {isDraft
                    ? "Draft — not enrollable"
                    : "In review — not enrollable"}
                </Button>
              ) : !isFree && !owned ? (
                <div className="flex flex-col gap-3">
                  <BuyNowButton productId={course.id} className="w-full rounded-sm h-12 text-base font-semibold" />
                  <AddToCartButton productId={course.id} className="w-full rounded-sm h-12" />
                  <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground mt-2 border-t border-border/50 pt-3">
                    <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    Payment happens on the provider&apos;s hosted page — no card data touches Zapsters.
                  </p>
                </div>
              ) : (
                <Button
                  className="w-full rounded-sm h-12 text-base font-semibold"
                  disabled={enrollMutation.isPending}
                  onClick={() => enrollMutation.mutate()}
                >
                  {enrollMutation.isPending ? (
                    <>
                      <LoaderCircle className="animate-spin mr-2" />
                      Enrolling…
                    </>
                  ) : isFree ? (
                    <>
                      Enroll for free
                      <ArrowRight className="ml-2" />
                    </>
                  ) : (
                    <>
                      Enroll now
                      <ArrowRight className="ml-2" />
                    </>
                  )}
                </Button>
              )}

              {enrollment ? (
                <Button variant="outline" asChild className="w-full rounded-sm border-border">
                  <Link href={`/courses/${course.id}/learn`}>
                    <BookOpen className="size-4 mr-2" />
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

        <div className="mt-6 flex flex-col gap-4">
          {course.syllabus.map((section, si) => {
            const sectionCompleted = section.lessons.filter(
              (l) => completedSet.has(l.id),
            ).length;
            return (
               <div key={section.id} className="border border-border bg-card shadow-sm">
                <div className="flex flex-row items-center justify-between gap-3 bg-muted/20 border-b border-border/40 p-5">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-w-8">
                      {String(si + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">
                        {section.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {section.lessons.length} lessons
                      </p>
                    </div>
                  </div>
                  {enrollment && sectionCompleted > 0 ? (
                    <Badge variant="outline" className="border-success/30 bg-success/10 text-success-strong text-caption">
                      {sectionCompleted}/{section.lessons.length}
                    </Badge>
                  ) : null}
                </div>
                <div className="p-2">
                  {section.lessons.map((lesson, li) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      index={li}
                       completed={completedSet.has(lesson.id)}
                     />
                  ))}
                </div>
              </div>
            );
          })}
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
