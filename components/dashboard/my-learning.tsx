"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";

import { listMyLearning, type MyLearningItem } from "@/lib/api/content";
import { useSession } from "@/components/providers/session-provider";
import { hueForId } from "@/lib/visual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";

function coverGradient(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${(hue + 60) % 360}, 50%, 30%))`;
}

function MyLearningRow({ item }: { item: MyLearningItem }) {
  const { enrollment, course } = item;
  const completed = enrollment.status === "completed";
  const progress = Math.round(enrollment.progress_pct);

  const ctaHref = completed
    ? `/courses/${course.id}`
    : `/courses/${course.id}/learn`;
  const ctaLabel = completed
    ? "Review course"
    : progress > 0
      ? "Continue learning"
      : "Start course";

  return (
    <Link
      href={ctaHref}
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/5">
        <div className="flex items-center gap-4 p-4 sm:p-5">
          {/* Cover thumb */}
          <div
            className="relative hidden h-16 w-28 shrink-0 overflow-hidden rounded-lg sm:block"
            style={{ background: coverGradient(hueForId(course.id)) }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <span className="absolute bottom-1.5 left-2 right-2 truncate text-[10px] font-semibold text-white">
              {course.category}
            </span>
          </div>

          {/* Title + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-sm font-semibold tracking-tight sm:text-base">
                {course.title}
              </h3>
              {completed ? (
                <Badge variant="success" className="shrink-0 text-[10px]">
                  <CheckCircle2 className="size-3" />
                  Completed
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {course.instructor_name} · {course.level}
            </p>

            {/* Progress */}
            <div className="mt-3 flex items-center gap-3">
              <Progress
                value={progress}
                className="h-1.5 max-w-xs flex-1"
                indicatorClassName={completed ? "bg-success" : undefined}
              />
              <span
                className={cn(
                  "shrink-0 text-xs font-medium tabular-nums",
                  completed ? "text-success-strong" : "text-muted-foreground",
                )}
              >
                {progress}%
              </span>
            </div>
          </div>

          {/* CTA */}
          <Button
            variant={completed ? "outline" : "default"}
            size="sm"
            className="shrink-0"
            asChild
          >
            <span className="flex items-center gap-1.5">
              {completed ? (
                <BookOpen className="size-4" />
              ) : (
                <PlayCircle className="size-4" />
              )}
              {ctaLabel}
              <ArrowRight className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Button>
        </div>
      </Card>
    </Link>
  );
}

function MyLearningSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-28 shrink-0 animate-pulse rounded-lg bg-secondary" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
              <div className="h-1.5 w-full animate-pulse rounded-full bg-secondary" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * "My learning" — the learner's enrollments with live progress bars.
 * Data comes from the mock Content API (listMyLearning); progress is
 * derived server-side, never in the component.
 */
export function MyLearning() {
  const { user } = useSession();
  const userId = user?.id ?? "";

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["my-learning", userId],
    queryFn: () => listMyLearning(userId),
    enabled: Boolean(userId),
  });

  const inProgressCount =
    data?.filter((item) => item.enrollment.status !== "completed").length ?? 0;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            My learning
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data && data.length > 0
              ? `${data.length} enrolled · ${inProgressCount} in progress`
              : "Your enrollments and progress, pulled from the mock enrollments state."}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/courses">
            Browse catalog <ArrowRight />
          </Link>
        </Button>
      </div>

      <div className="mt-5">
        {!userId ? (
          <EmptyState
            icon={BookOpen}
            title="Sign in to see your learning"
            description="Your enrollments, progress and resume positions live here once you're signed in."
            action={
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
                : "The enrollments backend is not responding."
            }
            code="ENROLLMENTS_ERR"
            onRetry={() => refetch()}
          />
        ) : data && data.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Enroll in your first course and it will show up here with live progress."
            action={
              <Button variant="gradient" size="sm" asChild>
                <Link href="/courses">
                  Browse the catalog <ArrowRight />
                </Link>
              </Button>
            }
          />
        ) : data ? (
          <div className="flex flex-col gap-3">
            {data.map((item, i) => (
              <motion.div
                key={item.course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.35, ease: "easeOut" }}
              >
                <MyLearningRow item={item} />
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
