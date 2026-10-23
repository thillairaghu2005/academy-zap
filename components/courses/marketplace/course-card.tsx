"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, PlayCircle } from "lucide-react";

import type { MarketplaceCourse } from "@/lib/mocks/marketplace";
import { useMarketplaceState } from "@/components/courses/marketplace/hover-preview";
import { CourseThumbnail } from "@/components/courses/marketplace/course-thumbnail";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Enterprise Course Card.
 *
 * Implements the 10-point information hierarchy required for Zapsters Academy,
 * inspired by AWS Skill Builder and IBM SkillsBuild:
 * 1. Restrained thumbnail or category visual
 * 2. Course title
 * 3. Short course description
 * 4. Category or subject
 * 5. Difficulty level
 * 6. Course duration
 * 7. Learning format
 * 8. Instructor or provider
 * 9. Enrollment or progress status
 * 10. Clear action ("View Course", "Start Learning", or "Continue Learning")
 */

export const CourseCard = React.memo(function CourseCard({
  course,
  className,
}: {
  course: MarketplaceCourse;
  className?: string;
}) {
  const { enrolledCourseIds } = useMarketplaceState();
  const enrolled = enrolledCourseIds.has(course.id);
  const progressPct = Math.round((course.progressPercent ?? 0) * 100);
  const isCompleted = progressPct >= 100;

  // Format label mapping
  const formatLabel =
    course.type === "lab"
      ? "Hands-on Lab"
      : course.type === "assessment"
        ? "Skill Assessment"
        : course.type === "project"
          ? "Guided Project"
          : "Digital Training";

  // Level label
  const levelLabel =
    course.level === "advanced"
      ? "Professional"
      : course.level === "intermediate"
        ? "Associate"
        : "Foundational";

  // Action destination and label
  const targetUrl = enrolled ? `/courses/${course.id}/learn` : `/courses/${course.id}`;
  const actionLabel = enrolled
    ? isCompleted
      ? "Review Course"
      : progressPct > 0
        ? "Continue Learning"
        : "Start Learning"
    : "View Course";

  return (
    <article
      data-course-card={course.id}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] duration-150 ease-out",
        "hover:border-border-strong hover:shadow-md focus-within:border-ring focus-within:shadow-md",
        className,
      )}
    >
      {/* 1. Restrained thumbnail / category visual */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900">
        <CourseThumbnail courseId={course.id} category={course.category} />
      </div>

      {/* Main card body with strictly aligned vertical layout */}
      <div className="flex flex-1 flex-col p-5">
        {/* 4 & 7. Category & Learning format */}
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {course.category}
          </span>
          <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
            {formatLabel}
          </span>
        </div>

        {/* 2. Course title */}
        <h3 className="line-clamp-2 min-h-[3rem] font-display text-base font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
          <Link
            href={targetUrl}
            className="outline-none focus-visible:underline"
          >
            {course.title}
          </Link>
        </h3>

        {/* 3. Short course description */}
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground flex-1">
          {course.description}
        </p>

        {/* 5, 6 & 8. Difficulty level, Duration, Instructor */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground border-t border-border/50 pt-3">
          <span className="font-medium text-foreground">{levelLabel}</span>
          <span className="text-border" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3 text-muted-foreground" aria-hidden="true" />
            {course.durationHours} Hours
          </span>
          <span className="text-border" aria-hidden="true">·</span>
          <span className="truncate max-w-[140px] text-muted-foreground">
            {course.instructor || "Zapsters Academy"}
          </span>
        </div>

        {/* 9. Enrollment or progress status */}
        <div className="mt-3.5 pt-1">
          {enrolled ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" />
                    Completed
                  </span>
                ) : (
                  <span className="text-muted-foreground">Progress</span>
                )}
                <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                  {progressPct}%
                </span>
              </div>
              <Progress
                value={progressPct}
                className="h-1.5 rounded-full bg-secondary"
                indicatorClassName="bg-primary"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{course.isFree ? "Free Access" : `₹${(course.priceCents / 100).toLocaleString("en-IN")}`}</span>
              {course.badge && (
                <span className="text-[11px] font-medium text-foreground">
                  Skill Credential
                </span>
              )}
            </div>
          )}
        </div>

        {/* 10. Clear primary action */}
        <div className="mt-4 pt-2">
          <Button
            variant={enrolled ? "default" : "outline"}
            size="sm"
            className="w-full justify-center gap-1.5 font-semibold"
            asChild
          >
            <Link href={targetUrl}>
              {enrolled && <PlayCircle className="size-3.5" aria-hidden="true" />}
              <span>{actionLabel}</span>
              {!enrolled && <ArrowRight className="size-3.5" aria-hidden="true" />}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
});

/** Skeleton placeholder used while catalog results load. */
export function CourseCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="aspect-[16/9] w-full bg-muted animate-pulse" />
      <div className="flex flex-1 flex-col p-5 space-y-3">
        <div className="flex justify-between">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-5 w-4/5 bg-muted rounded animate-pulse" />
        <div className="h-3.5 w-full bg-muted rounded animate-pulse" />
        <div className="h-3.5 w-2/3 bg-muted rounded animate-pulse" />
        <div className="mt-auto space-y-2 pt-4 border-t border-border/50">
          <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          <div className="h-8 w-full bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
