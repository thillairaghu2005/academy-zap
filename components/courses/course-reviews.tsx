"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatReviewDate } from "@/lib/format";
import { getCourseReviews } from "@/lib/data/demo/reviews";

export interface CourseReviewsProps {
  courseId: string;
  rating: number;
  reviewCount: number;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CourseReviews({ courseId, rating, reviewCount }: CourseReviewsProps) {
  const reviewsQuery = useInfiniteQuery({
    queryKey: ["course-reviews", courseId],
    queryFn: ({ pageParam }) => getCourseReviews(courseId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.has_more
        ? lastPage.offset + lastPage.reviews.length
        : undefined,
  });

  const reviewRows = reviewsQuery.data?.pages.flatMap((page) => page.reviews) ?? [];

  return (
    <div className="mt-12">
      <h2 className="font-display text-h2">Reviews</h2>
      <div className="mt-4 flex flex-col items-start gap-6 rounded-[28px] border border-border bg-card p-8 shadow-[0_12px_32px_rgb(17_24_39_/_0.04)] sm:flex-row sm:items-start">
        <div className="text-center sm:text-left shrink-0">
          <p className="font-display text-h1">
            {rating > 0 ? rating.toFixed(1) : "—"}
          </p>
          <div className="mt-1 flex items-center justify-center gap-0.5 sm:justify-start">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "size-4",
                  i < Math.round(rating)
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {reviewCount > 0
              ? `${reviewCount.toLocaleString()} reviews`
              : "No reviews yet"}
          </p>
        </div>
        <div className="flex-1 border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 w-full">
          {reviewsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading learner reviews…</p>
          ) : reviewRows.length > 0 ? (
            <div className="flex flex-col gap-5">
              {reviewRows.map((review) => (
                <article key={review.id} className="flex gap-3">
                  <Avatar className="size-9 shrink-0">
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
                                : "text-muted-foreground/30"
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
  );
}
