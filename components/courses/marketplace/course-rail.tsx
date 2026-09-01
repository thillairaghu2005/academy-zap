"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { MarketplaceCourse } from "@/lib/mocks/marketplace";
import { CourseCard } from "@/components/courses/marketplace/course-card";
import { useCourseHoverPreview } from "@/components/courses/marketplace/hover-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Horizontal course rail (Udemy-style carousel row).
 *
 * - Native horizontal scrolling with a hidden scrollbar (`.rail-scroll`).
 * - Circular prev/next arrows fade in on section hover and page by ~90% of
 *   the visible width; they disable at either end.
 * - Scrolling the rail immediately dismisses any open hover preview, since
 *   the anchor geometry is invalidated.
 * - Cards keep a fixed compact width and snap on touch devices.
 */

const EDGE_EPSILON = 4;

export function CourseRail({
  title,
  description,
  courses,
  className,
}: {
  title: string;
  description?: string;
  courses: MarketplaceCourse[];
  className?: string;
}) {
  const preview = useCourseHoverPreview();
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateArrows = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > EDGE_EPSILON);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - EDGE_EPSILON);
  }, []);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateArrows, courses.length]);

  if (courses.length === 0) return null;

  const page = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    preview.close();
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.9), behavior: "smooth" });
  };

  return (
    <section aria-label={title} className={cn("group/rail relative", className)}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-h4 font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 max-w-2xl text-small text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="relative">
        {/* Prev / next arrows */}
        <RailArrow
          side="left"
          visible={canScrollLeft}
          onClick={() => page(-1)}
          label={`Scroll ${title} back`}
        />
        <RailArrow
          side="right"
          visible={canScrollRight}
          onClick={() => page(1)}
          label={`Scroll ${title} forward`}
        />

        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className="rail-scroll -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2"
        >
          {courses.map((course) => (
            <div key={course.id} className="flex flex-col min-w-[240px] shrink-0 snap-start sm:w-[calc(50%-8px)] md:w-[calc(33.333%-10.66px)] lg:w-[calc(25%-12px)] xl:w-[calc(25%-12px)]">
              <CourseCard course={course} className="flex-1" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RailArrow({
  side,
  visible,
  onClick,
  label,
}: {
  side: "left" | "right";
  visible: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      tabIndex={visible ? 0 : -1}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-20 size-10 -translate-y-1/2 rounded-full border-border bg-card/95 shadow-[0_8px_24px_rgb(17_24_39_/_0.18)] backdrop-blur transition-all duration-200",
        "hover:bg-card hover:shadow-[0_10px_28px_rgb(17_24_39_/_0.22)]",
        // Fade in only while the section is hovered or the button is focused.
        "opacity-0 pointer-events-none group-hover/rail:pointer-events-auto group-hover/rail:opacity-100 focus-visible:opacity-100 focus-visible:pointer-events-auto",
        side === "left" ? "-left-4 lg:-left-5" : "-right-4 lg:-right-5",
        !visible && "invisible",
      )}
    >
      {side === "left" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
    </Button>
  );
}
