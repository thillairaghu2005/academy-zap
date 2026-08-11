"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Compass,
  Flame,
  Layers3,
  Play,
  Trophy,
} from "lucide-react";

import { listMyLearning, type MyLearningItem } from "@/lib/data/demo/content";
import { useSession } from "@/components/providers/session-provider";
import { hueForId } from "@/lib/visual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { LearningInsights } from "@/components/dashboard/learning-insights";

function coverGradient(hue: number): string {
  void hue;
  return "linear-gradient(135deg, var(--color-primary-light), var(--color-surface-3))";
}

function lessonCount(item: MyLearningItem): number {
  return item.course.total_lessons === 0
    ? 0
    : Math.round(
        (item.course.total_lessons * item.enrollment.progress_pct) / 100,
      );
}

function remainingTime(item: MyLearningItem): string {
  const hours =
    item.course.estimated_hours * (1 - item.enrollment.progress_pct / 100);
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (wholeHours === 0) return `${Math.max(1, minutes)} min left`;
  if (minutes === 0) return `${wholeHours}h left`;
  return `${wholeHours}h ${minutes}m left`;
}

function statusFor(item: MyLearningItem): {
  label: string;
  className: string;
  icon: typeof CheckCircle2;
} {
  if (item.enrollment.status === "completed") {
    return {
      label: "Completed",
      className: "bg-success/10 text-success-strong",
      icon: CheckCircle2,
    };
  }

  if (item.enrollment.progress_pct > 0) {
    return {
      label: "In progress",
      className: "bg-primary/10 text-primary",
      icon: Play,
    };
  }

  return {
    label: "Not started",
    className: "bg-secondary text-muted-foreground",
    icon: Layers3,
  };
}

function StatsRow({ items }: { items: MyLearningItem[] }) {
  const completed = items.filter(
    (item) => item.enrollment.status === "completed",
  ).length;
  const active = items.filter(
    (item) => item.enrollment.status !== "completed",
  ).length;
  const hoursLearned = items.reduce(
    (hours, item) =>
      hours + item.course.estimated_hours * (item.enrollment.progress_pct / 100),
    0,
  );
  const formattedHours = Number.isInteger(hoursLearned)
    ? String(hoursLearned)
    : hoursLearned.toFixed(1);
  const stats = [
    { label: "Courses enrolled", value: items.length, icon: BookOpen },
    { label: "Active", value: active, icon: Flame },
    { label: "Completed", value: completed, icon: Trophy },
    { label: "Hours learned", value: formattedHours, icon: Clock3 },
  ];

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            "flex items-center gap-3 px-4 py-4 sm:px-5 sm:py-5",
            index > 0 && "border-l-0 border-border sm:border-l",
            index > 1 && "border-t sm:border-t-0",
          )}
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
            <stat.icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold tracking-tight tabular-nums">
              {stat.value}
            </p>
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContinueLearning({ item }: { item: MyLearningItem }) {
  const { enrollment, course } = item;
  const progress = Math.round(enrollment.progress_pct);
  const completedLessons = lessonCount(item);
  const totalLessons = course.total_lessons;
  const ctaLabel = progress > 0 ? "Resume course" : "Start course";

  return (
    <Card variant="glow" className="group relative overflow-hidden rounded-3xl border-primary-border bg-primary-muted shadow-[0_4px_12px_rgb(16_24_40_/_6%)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_rgb(16_24_40_/_8%)]">
      <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/10 blur-3xl transition-opacity duration-300 group-hover:opacity-80" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-primary-muted/60 lg:block" />

      <div className="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.72fr)] lg:items-center lg:gap-12 lg:p-9">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-primary/10 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
              Continue learning
            </Badge>
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px] font-medium">
              {course.category}
            </Badge>
            <span className="text-xs text-muted-foreground">Up next in your journey</span>
          </div>

          <h3 className="mt-5 max-w-xl font-display text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">
            {course.title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Instructor <span className="mx-1.5 text-border">/</span> {course.instructor_name}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <Check className="size-4 text-primary" />
              {completedLessons} / {totalLessons} lessons
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4" />
              {remainingTime(item)}
            </span>
          </div>

          <div className="mt-5 max-w-xl">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Course progress</span>
              <span className="font-display text-sm font-semibold tabular-nums text-foreground">
                {progress}%
              </span>
            </div>
            <Progress
              value={progress}
              className="h-2 rounded-full bg-primary/10"
               indicatorClassName="bg-primary"
            />
          </div>

          <Button className="mt-7 rounded-lg px-4 shadow-sm shadow-primary/20" asChild>
            <Link href={`/courses/${course.id}/learn`}>
              <Play className="size-4 fill-current" />
              {ctaLabel}
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>

        <div className="relative flex min-h-[180px] items-end overflow-hidden rounded-xl border border-primary/10 p-5 shadow-inner lg:min-h-[220px] lg:p-6" style={{ background: coverGradient(hueForId(course.id)) }}>
          <div className="absolute inset-0 bg-primary-light/50" />
          <div className="absolute right-5 top-5 rounded-full border border-primary/15 bg-white/75 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm">
            {course.level} level
          </div>
          <div className="relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Your next milestone
            </p>
            <p className="mt-2 max-w-[17rem] font-display text-lg font-semibold leading-snug text-foreground">
              Keep the momentum going. You&apos;re building a skill that compounds.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function LearningCard({ item }: { item: MyLearningItem }) {
  const { enrollment, course } = item;
  const progress = Math.round(enrollment.progress_pct);
  const status = statusFor(item);
  const StatusIcon = status.icon;
  const href = enrollment.status === "completed" ? `/courses/${course.id}` : `/courses/${course.id}/learn`;

  return (
    <Link
      href={href}
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full rounded-xl border-border/80 shadow-none transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-[0_12px_30px_-22px_rgba(31,41,55,0.65)]">
        <div className="flex min-h-[108px] items-center gap-3.5 p-4 sm:gap-4 sm:p-4.5">
          <div
            className="relative size-12 shrink-0 overflow-hidden rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-[1.04] sm:size-14"
            style={{ background: coverGradient(hueForId(course.id)) }}
          >
            <div className="absolute inset-0 bg-primary-light/50" />
            <span className="absolute bottom-1 left-1.5 right-1.5 truncate text-[9px] font-semibold uppercase tracking-wide text-primary">
              {course.category}
            </span>
          </div>

          <div className="min-w-0 flex-1 self-stretch py-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-display text-sm font-semibold tracking-[-0.01em] sm:text-[15px]">
                  {course.title}
                </h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {course.instructor_name}
                </p>
              </div>
              <span className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-all duration-200 group-hover:bg-primary/10 group-hover:text-primary">
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <Progress
                value={progress}
                className="h-1.5 bg-secondary"
                indicatorClassName={cn(
                  enrollment.status === "completed" ? "bg-success" : "bg-primary",
                  "transition-[width] duration-700",
                )}
              />
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                {progress}%
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", status.className)}>
                <StatusIcon className="size-3" />
                {status.label}
              </span>
              <span className="hidden text-[11px] text-muted-foreground sm:block">
                {course.estimated_hours}h course
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function LearningJourney({ items }: { items: MyLearningItem[] }) {
  const hasStarted = items.some((item) => item.enrollment.progress_pct > 0);
  const hasCompleted = items.some((item) => item.enrollment.status === "completed");
  const totalProgress = items.length
    ? Math.round(items.reduce((total, item) => total + item.enrollment.progress_pct, 0) / items.length)
    : 0;
  const milestones = [
    {
      label: "Choose a direction",
      detail: `${items.length} ${items.length === 1 ? "course" : "courses"} in your library`,
      icon: Compass,
      complete: items.length > 0,
    },
    {
      label: "Build the habit",
      detail: hasStarted ? "You have momentum. Keep the next session small." : "Start one lesson to make progress visible.",
      icon: Flame,
      complete: hasStarted,
    },
    {
      label: "Prove the skill",
      detail: hasCompleted ? "A completed course is now part of your record." : "Finish a course to unlock your first verified milestone.",
      icon: Trophy,
      complete: hasCompleted,
    },
    {
      label: "Keep compounding",
      detail: totalProgress >= 75 ? "You are close to the next meaningful milestone." : "Your next focused session is the shortest path forward.",
      icon: ArrowRight,
      complete: totalProgress >= 75,
    },
  ];

  return (
    <Card variant="glass" className="mt-8 overflow-hidden rounded-3xl p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Learning journey</p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em]">Small steps, visible momentum.</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">The platform keeps the next action close. Follow the line, finish the work, and let each verified effort open the next door.</p>
        </div>
        <div className="rounded-2xl bg-primary/5 px-4 py-3 text-right">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Library average</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-primary">{totalProgress}%</p>
        </div>
      </div>

      <div className="relative mt-8 grid gap-5 sm:grid-cols-4 sm:gap-3">
        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-border sm:block" aria-hidden="true" />
        {milestones.map((milestone, index) => {
          const Icon = milestone.icon;
          return (
            <div key={milestone.label} className="relative flex items-start gap-3 sm:block sm:text-center">
              <span className={cn("relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-4 border-card text-sm transition-colors", milestone.complete ? "bg-primary text-primary-foreground shadow-[0_0_0_4px_rgb(180_35_60_/_10%)]" : "bg-surface-1 text-muted-foreground")}>
                {milestone.complete ? <Check className="size-4" /> : <Icon className="size-4" />}
              </span>
              <div className="min-w-0 sm:mt-3 sm:px-2">
                <p className={cn("text-sm font-semibold", milestone.complete ? "text-foreground" : "text-muted-foreground")}>{milestone.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{milestone.detail}</p>
              </div>
              {index < milestones.length - 1 ? <span className="absolute bottom-[-1.25rem] left-5 top-10 w-px bg-border sm:hidden" aria-hidden="true" /> : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MyLearningSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse bg-card" />
        ))}
      </div>
      <Card className="h-[360px] animate-pulse bg-secondary/50 shadow-none" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="h-[108px] animate-pulse bg-secondary/50 shadow-none" />
        ))}
      </div>
    </div>
  );
}

/** "My learning" — the learner's active journey with live progress. */
export function MyLearning() {
  const { user } = useSession();
  const reducedMotion = useReducedMotion() ?? false;
  const userId = user?.id ?? "";

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["my-learning", userId],
    queryFn: () => listMyLearning(userId),
    enabled: Boolean(userId),
  });

  const activeCount =
    data?.filter((item) => item.enrollment.status !== "completed").length ?? 0;

  return (
    <section className="mt-16 sm:mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Your workspace
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            My learning
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Pick up where you left off and keep your learning streak moving.
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-lg" asChild>
          <Link href="/courses">
            Browse catalog <ArrowRight />
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        {!userId ? (
          <EmptyState
            icon={BookOpen}
            title="Sign in to see your learning"
            description="Your enrollments, progress and resume positions live here once you're signed in."
            primaryAction={
              <Button variant="gradient" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            }
          />
        ) : isLoading ? (
          <MyLearningSkeleton />
        ) : isError ? (
          <ErrorState
            title="Couldn't load your courses"
            message={
              error instanceof Error
                ? error.message
                 : "Your learning demo data is unavailable."
            }
            code="ENROLLMENTS_ERR"
            onRetry={() => refetch()}
          />
        ) : data && data.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Enroll in your first course and it will show up here with live progress."
            primaryAction={
              <Button variant="gradient" size="sm" asChild>
                <Link href="/courses">
                  Browse the catalog <ArrowRight />
                </Link>
              </Button>
            }
            secondaryAction={
              <Button variant="outline" size="sm" asChild>
                <Link href="/labs">Explore labs</Link>
              </Button>
            }
          />
        ) : data ? (
          <>
            <StatsRow items={data} />

            {(() => {
              const featured =
                data.find(
                  (item) =>
                    item.enrollment.status !== "completed" &&
                    item.enrollment.progress_pct > 0,
                ) ?? data.find((item) => item.enrollment.status !== "completed") ?? data[0];
              if (!featured) return null;
              const secondary = data.filter((item) => item !== featured);

               return (
                 <div className="mt-6 space-y-10">
                  <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={reducedMotion ? undefined : { duration: 0.4, ease: "easeOut" }}
                  >
                    <ContinueLearning item={featured} />
                  </motion.div>

                  {secondary.length > 0 ? (
                    <div>
                      <div className="mb-4 flex items-end justify-between gap-3">
                        <div>
                          <h3 className="font-display text-lg font-semibold tracking-[-0.02em]">
                            Your courses
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {activeCount} active {activeCount === 1 ? "course" : "courses"} in your library
                          </p>
                        </div>
                        <span className="hidden text-xs text-muted-foreground sm:block">
                          {secondary.length} more {secondary.length === 1 ? "course" : "courses"}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {secondary.map((item, i) => (
                          <motion.div
                            key={item.course.id}
                            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                            transition={reducedMotion ? undefined : { delay: 0.05 * (i + 1), duration: 0.35, ease: "easeOut" }}
                          >
                            <LearningCard item={item} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                   ) : null}
                   <LearningJourney items={data} />
                   <LearningInsights items={data} />
                 </div>
               );
            })()}
          </>
        ) : null}
      </div>
    </section>
  );
}
