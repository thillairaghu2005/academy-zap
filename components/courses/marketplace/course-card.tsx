"use client";

import * as React from "react";
import Link from "next/link";

import type { MarketplaceCourse } from "@/lib/mocks/marketplace";
import {
  PriceDisplay,
  useCourseActions,
  useCourseHoverPreview,
  useMarketplaceState,
} from "@/components/courses/marketplace/hover-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Compact marketplace course card (Udemy-style rail tile).
 *
 * The whole card is a click target via a stretched link, while the action
 * buttons sit above it in stacking order so they remain real, focusable
 * buttons. Hovering schedules the floating preview; leaving revokes it.
 * All commerce state (in cart / enrolled) is read from page-level context
 * so a cart mutation re-renders every card consistently.
 */

export const CourseCard = React.memo(function CourseCard({
  course,
  className,
}: {
  course: MarketplaceCourse;
  className?: string;
}) {
  const preview = useCourseHoverPreview();
  const { enrolledCourseIds } = useMarketplaceState();
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const enrolled = enrolledCourseIds.has(course.id);

  return (
    <div
      ref={cardRef}
      data-course-card={course.id}
      onMouseEnter={() => {
        if (cardRef.current) preview.schedule(course, cardRef.current);
      }}
      onMouseLeave={preview.revoke}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-5 sm:p-6 transition-[box-shadow,border-color] duration-150 ease-out",
        "hover:border-border-strong hover:shadow-md",
        "focus-within:border-ring focus-within:shadow-md",
        className,
      )}
    >
      {/* Stretched link */}
      <Link
        href={enrolled ? `/courses/${course.id}/learn` : `/courses/${course.id}`}
        aria-label={course.title}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      />

      {/* Header track & format metadata */}
      <div className="relative z-10 mb-3 flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold truncate max-w-[170px]">
          {course.category}
        </span>
        <span className="rounded-md border border-border/60 bg-surface-1 px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
          {course.type} track
        </span>
      </div>

      {/* Body */}
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground/90 truncate max-w-[180px]">{course.instructor}</span>
          <span className="text-[10px] text-muted-foreground/70 font-mono capitalize">{course.level}</span>
        </div>
        
        <h3 className="mb-3 line-clamp-2 min-h-[2.6em] font-display text-base font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
          {course.title}
        </h3>

        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[10px]">
          <div className="rounded-md bg-surface-1 px-2.5 py-1 font-medium text-muted-foreground border border-border/50">
             {course.durationHours}h estimated
          </div>
          {course.badge && (
            <div className="rounded-md bg-surface-1 px-2.5 py-1 font-medium text-muted-foreground border border-border/50">
               <span className="capitalize">{course.badge.toLowerCase()}</span>
            </div>
          )}
          {course.isFree && !course.badge && (
            <div className="rounded-md bg-surface-1 px-2.5 py-1 font-medium text-muted-foreground border border-border/50">
               Free Access
            </div>
          )}
        </div>
        
        {/* Progress bar if enrolled */}
        {enrolled && (
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.round((course.progressPercent ?? 0) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground font-mono">
              {Math.round((course.progressPercent ?? 0) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-auto flex items-end justify-between pt-3">
         <div className="flex flex-col gap-0.5">
            <PriceDisplay course={course} />
            <span className="text-[11px] font-medium text-muted-foreground/70">
              Rating: {course.rating.toFixed(1)} ({course.reviewCount.toLocaleString()})
            </span>
         </div>
         <CardActions course={course} enrolled={enrolled} />
      </div>
    </div>
  );
});

function CardActions({ course, enrolled }: { course: MarketplaceCourse; enrolled: boolean }) {
  const actions = useCourseActions(course);
  const isLoggedIn = !!actions.userId;

  if (course.comingSoon) {
    return (
      <Button variant="secondary" size="sm" disabled className="h-9 px-5 rounded-lg text-xs font-semibold">
        Coming soon
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <Button size="sm" className="h-9 px-5 rounded-lg text-xs font-semibold shadow-none bg-primary text-primary-foreground hover:bg-primary/90" asChild>
        <Link href={`/login?callbackUrl=/courses/${course.id}`}>
          Enroll
        </Link>
      </Button>
    );
  }

  if (enrolled) {
    const hasProgress = (course.progressPercent ?? 0) > 0;
    return (
      <Button size="sm" className="h-9 px-5 rounded-lg text-xs font-semibold shadow-none bg-primary text-primary-foreground hover:bg-primary/90" asChild>
        <Link href={`/courses/${course.id}/learn`}>
          {hasProgress ? "Resume" : "Start"}
        </Link>
      </Button>
    );
  }

  return (
    <Button size="sm" className="h-9 px-5 rounded-lg text-xs font-semibold shadow-none bg-primary text-primary-foreground hover:bg-primary/90" asChild>
      <Link href={`/courses/${course.id}`}>
        Enroll
      </Link>
    </Button>
  );
}

/** Skeleton placeholder used while rails lazy-mount. */
export function CourseCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-[280px] flex-col overflow-hidden rounded-xl border border-border bg-card p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="size-10 animate-pulse rounded-full bg-muted" />
        <div className="size-8 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="mb-2 h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="mb-4 h-5 w-4/5 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-5 w-12 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-auto flex items-end justify-between border-t border-border/60 pt-4">
        <div className="h-6 w-16 animate-pulse rounded bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
