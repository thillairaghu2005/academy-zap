"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  LoaderCircle,
  PlayCircle,
  ShoppingCart,
  Star,
  Zap,
} from "lucide-react";

import type { MarketplaceCourse } from "@/lib/mocks/marketplace";
import { CourseThumbnail } from "@/components/courses/marketplace/course-thumbnail";
import {
  PriceDisplay,
  useCourseActions,
  useCourseHoverPreview,
  useMarketplaceState,
} from "@/components/courses/marketplace/hover-preview";
import { Badge } from "@/components/ui/badge";
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
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-[box-shadow,border-color,transform] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_16px_40px_rgb(17_24_39_/_0.14)]",
        "focus-within:border-ring focus-within:shadow-[0_16px_40px_rgb(17_24_39_/_0.14)]",
        className,
      )}
    >
      {/* Stretched link — makes the entire card clickable */}
      <Link
        href={`/courses/${course.id}`}
        aria-label={course.title}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      />

      {/* Thumbnail */}
      <div className="relative z-10 aspect-[16/9] w-full overflow-hidden">
        <CourseThumbnail courseId={course.id} category={course.category} />
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          {course.badge === "BESTSELLER" ? (
            <Badge className="border-transparent bg-warning-strong text-white">Bestseller</Badge>
          ) : null}
          {course.badge === "NEW" ? (
            <Badge className="border-transparent bg-success-strong text-white">New</Badge>
          ) : null}
          {course.badge === "POPULAR" ? (
            <Badge className="border-transparent bg-primary text-primary-foreground">Popular</Badge>
          ) : null}
          {course.badge === "HIGH RATED" ? (
            <Badge className="border-border bg-card/90 text-foreground backdrop-blur-sm">High rated</Badge>
          ) : null}
          {course.isFree && !course.badge ? (
            <Badge className="border-transparent bg-primary text-primary-foreground">Free</Badge>
          ) : null}
        </div>
        {enrolled ? (
          <>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.round((course.progressPercent ?? 0) * 100)}%` }}
              />
            </div>
            <div className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-caption font-semibold text-white backdrop-blur-sm">
              {Math.round((course.progressPercent ?? 0) * 100)}%
            </div>
          </>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="line-clamp-2 min-h-[2.6em] font-display text-small font-semibold leading-snug tracking-tight text-foreground">
          {course.title}
        </h3>
        <p className="text-caption text-muted-foreground">{course.instructor}</p>

        <div className="mt-0.5 flex items-center gap-1.5 text-caption">
          {course.rating > 0 ? (
            <>
              <span className="inline-flex items-center gap-0.5 font-bold text-warning-strong">
                {course.rating.toFixed(1)}
                <Star className="size-3 fill-warning-strong text-warning-strong" aria-hidden="true" />
              </span>
              <span className="text-muted-foreground">({course.reviewCount.toLocaleString()})</span>
            </>
          ) : (
            <span className="font-bold text-success-strong">New course</span>
          )}
        </div>

        <p className="flex items-center gap-1 text-caption text-muted-foreground">
          <Clock3 className="size-3" aria-hidden="true" />
          {course.durationHours}h · <span className="capitalize">{course.level}</span> ·{" "}
          {course.subcategory}
        </p>

        <div className="mt-auto pt-2">
          <PriceDisplay course={course} />
        </div>
      </div>

      {/* Actions */}
      <CardActions course={course} enrolled={enrolled} />
    </div>
  );
});

function CardActions({ course, enrolled }: { course: MarketplaceCourse; enrolled: boolean }) {
  const actions = useCourseActions(course);

  if (course.comingSoon) {
    return (
      <div className="relative z-10 border-t border-border px-3.5 py-2.5">
        <Button variant="secondary" size="sm" disabled className="w-full">
          Coming soon
        </Button>
      </div>
    );
  }

  if (enrolled) {
    return (
      <div className="relative z-10 border-t border-border px-3.5 py-2.5">
        <Button size="sm" className="w-full" asChild>
          <Link href={`/courses/${course.id}/learn`}>
            <PlayCircle className="size-4" />
            {(course.progressPercent ?? 0) > 0 ? "Continue learning" : "Start learning"}
          </Link>
        </Button>
      </div>
    );
  }

  if (course.isFree) {
    return (
      <div className="relative z-10 border-t border-border px-3.5 py-2.5">
        <Button
          size="sm"
          className="w-full"
          onClick={actions.startLearning.run}
          disabled={actions.startLearning.pending}
        >
          {actions.startLearning.pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <PlayCircle className="size-4" />
          )}
          Start learning
        </Button>
      </div>
    );
  }

  return (
    <CartActions course={course} actions={actions} />
  );
}

function CartActions({
  course,
  actions,
}: {
  course: MarketplaceCourse;
  actions: ReturnType<typeof useCourseActions>;
}) {
  const { cartProductIds } = useMarketplaceState();
  const inCart = cartProductIds.has(course.id);

  if (inCart) {
    return (
      <div className="relative z-10 border-t border-border px-3.5 py-2.5">
        <Button variant="secondary" size="sm" className="w-full" asChild>
          <Link href="/cart">
            <Check className="size-4 text-success-strong" />
            In cart — view
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex gap-2 border-t border-border px-3.5 py-2.5">
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={actions.addToCart.run}
        disabled={actions.addToCart.pending}
      >
        {actions.addToCart.pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ShoppingCart className="size-4" />
        )}
        Add to cart
      </Button>
      <Button
        size="sm"
        aria-label={`Buy now — ${course.title}`}
        onClick={actions.buyNow.run}
        disabled={actions.buyNow.pending}
      >
        {actions.buyNow.pending ? <LoaderCircle className="size-4 animate-spin" /> : <Zap className="size-4" />}
        <ArrowRight className="sr-only" />
        Buy
      </Button>
    </div>
  );
}

/** Skeleton placeholder used while rails lazy-mount. */
export function CourseCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="aspect-[16/9] w-full animate-pulse bg-muted" />
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-auto h-5 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="border-t border-border px-3.5 py-2.5">
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
