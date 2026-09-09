"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";

import type { CourseSummary } from "@/lib/contracts/content";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FeaturedCourseCardProps {
  course: CourseSummary;
  visualClass?: string;
  index?: number;
}

export function FeaturedCourseCard({ course, visualClass, index: _index }: FeaturedCourseCardProps) {
  const price = course.price_cents === 0 ? "Free" : `₹${(course.price_cents / 100).toLocaleString("en-IN")}`;

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-card p-6 shadow-[0_12px_32px_rgb(17_24_39_/_0.08)] transition-[box-shadow,border-color,transform] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_16px_40px_rgb(17_24_39_/_0.12)]",
        visualClass
      )}
    >
      {/* Stretched link */}
      <Link
        href={`/courses/${course.id}`}
        aria-label={course.title}
        className="absolute inset-0 z-0 rounded-[28px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      />

      {/* Header section (Avatar + Save) */}
      <div className="relative z-10 mb-5 flex items-center justify-between">
        <div className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-lg text-primary">
          {course.instructor_name.charAt(0)}
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary/80 transition-colors hover:bg-primary/15 cursor-pointer">
          Save
          <Bookmark className="size-3" />
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mb-1 flex items-baseline gap-2">
           <span className="text-sm font-semibold text-foreground">{course.instructor_name}</span>
           <span className="text-[11px] text-muted-foreground/60">5 days ago</span>
        </div>
        
        <h3 className="mb-3.5 line-clamp-2 min-h-[2.6em] font-display text-lg font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
          {course.title}
        </h3>

        <div className="mb-5 flex flex-wrap items-center gap-2 text-[11px]">
          <div className="rounded-full bg-muted/60 px-3 py-1 font-medium text-muted-foreground">
             <span className="capitalize">{course.level}</span>
          </div>
          <div className="rounded-full bg-muted/60 px-3 py-1 font-medium text-muted-foreground">
             {course.estimated_hours}h
          </div>
          {course.rating >= 4.5 && (
            <div className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
               Bestseller
            </div>
          )}
          {course.price_cents === 0 && (
            <div className="rounded-full bg-success/10 px-3 py-1 font-medium text-success-strong">
               Free
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-auto flex items-end justify-between border-t border-border/40 pt-5">
         <div className="flex flex-col gap-0.5">
            <span className="font-display font-bold tracking-tight text-foreground text-base">
               {price}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground/60">Remote, Online</span>
         </div>
         <Button
           size="sm"
           className="h-9 px-5 rounded-lg text-xs font-medium shadow-none bg-primary text-primary-foreground hover:bg-primary/90 pointer-events-none"
           tabIndex={-1}
         >
           Apply now
         </Button>
      </div>
    </div>
  );
}
