"use client";

import * as React from "react";
import Link from "next/link";

import type { CourseSummary } from "@/lib/contracts/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FeaturedCourseCardProps {
  course: CourseSummary;
  visualClass?: string;
  index?: number;
}

export function FeaturedCourseCard({ course, visualClass, index }: FeaturedCourseCardProps) {
  // Use a mock original price for the strikethrough effect
  const price = course.price_cents === 0 ? "Free" : `₹${(course.price_cents / 100).toFixed(2)}`;
  const originalPrice = course.price_cents === 0 ? "" : `₹${((course.price_cents * 1.5) / 100).toFixed(2)}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-md">
      <Link href={`/courses/${course.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className={cn("relative flex aspect-video items-center justify-center overflow-hidden bg-muted", visualClass)}>
          {/* Using website primary color for the background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
          {/* Mock Image Content */}
          <div className="z-10 text-center font-display text-xl font-bold text-foreground/50">
            {course.category}
          </div>
          {/* Mock Author Banner on Image */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-black backdrop-blur-sm">
            {course.instructor_name}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/courses/${course.id}`} className="outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <h3 className="line-clamp-2 min-h-[3rem] font-bold leading-snug text-foreground">
            {course.title}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{course.instructor_name}</p>
        
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {course.rating >= 4.5 && (
            <span className="rounded-sm bg-primary px-1.5 py-0.5 font-bold text-primary-foreground">
              Bestseller
            </span>
          )}
          {course.rating < 4.5 && course.rating > 0 && (
            <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-bold text-secondary-foreground">
              Role Play
            </span>
          )}
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-bold text-foreground">{price}</span>
            {originalPrice && (
              <span className="text-xs text-muted-foreground line-through">{originalPrice}</span>
            )}
          </div>
          <Button 
            variant="outline" 
            className="h-9 rounded border-primary font-bold text-primary hover:bg-primary/10 hover:text-primary"
          >
            Add to cart
          </Button>
        </div>
      </div>
    </article>  );
}
