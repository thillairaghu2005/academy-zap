"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { m as motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Compass,
  Flame,
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
  return `linear-gradient(135deg, oklch(0.94 0.045 ${hue}), oklch(0.985 0.012 ${hue}))`;
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
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 px-4 py-4 sm:px-5 sm:py-5"
        >
          <stat.icon className="size-5 shrink-0 text-muted-foreground" />
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
    <Card variant="glow" className="group relative overflow-hidden rounded-xl border-primary-border bg-primary-muted shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-md">
      <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/10 blur-3xl transition-opacity duration-300 group-hover:opacity-80" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-primary-muted/60 lg:block" />

      <div className="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.72fr)] lg:items-center lg:gap-12 lg:p-9">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-md border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
              Continue learning
            </Badge>
            <Badge variant="outline" className="rounded-md px-2.5 py-1 text-[11px] font-medium">
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

          <Button className="mt-7 rounded-lg px-4 shadow-sm" asChild>
            <Link href={`/courses/${course.id}/learn`}>
              <Play className="size-4 fill-current" />
              {ctaLabel}
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>

        <div className="relative flex min-h-[180px] items-end overflow-hidden rounded-xl border border-primary/10 p-5 shadow-inner lg:min-h-[220px] lg:p-6" style={{ background: coverGradient(hueForId(course.id)) }}>
          <div className="absolute inset-0 bg-primary-light/50" />
          <div className="absolute right-5 top-5 rounded-md border border-primary/20 bg-card/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
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
    <Card variant="glass" className="mt-8 overflow-hidden rounded-xl p-5 sm:p-7">
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

      <div className="relative mt-8 grid gap-5 sm:grid-cols-4 sm:gap-4">
        {milestones.map((milestone) => {
          const Icon = milestone.icon;
          return (
            <div key={milestone.label} className="relative flex items-start gap-3 sm:block sm:text-left">
              <Icon className={cn("size-5 shrink-0", milestone.complete ? "text-primary" : "text-muted-foreground")} />
              <div className="min-w-0 sm:mt-2">
                <p className={cn("text-sm font-semibold", milestone.complete ? "text-foreground" : "text-muted-foreground")}>{milestone.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{milestone.detail}</p>
              </div>
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
          <div key={i} className="h-20 bg-card" />
        ))}
      </div>
      <Card className="h-[360px] bg-secondary/50 shadow-none" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="h-[108px] bg-secondary/50 shadow-none" />
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

               return (
                 <div className="mt-6 space-y-10">
                  <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={reducedMotion ? undefined : { duration: 0.4, ease: "easeOut" }}
                  >
                    <ContinueLearning item={featured} />
                  </motion.div>

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
