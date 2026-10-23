"use client";

import * as React from "react";
import Link from "next/link";


import { ArrowRight } from "lucide-react";

import type { CourseSummary } from "@/lib/contracts/content";
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
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-[box-shadow,border-color] duration-200",
        "hover:border-border-strong hover:shadow-md",
        visualClass,
      )}
    >
      {/* Stretched link */}
      <Link
        href={`/courses/${course.id}`}
        aria-label={course.title}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      />

      {/* Header section (Instructor + category) */}
      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-foreground truncate max-w-[160px]">
          {course.instructor_name}
        </span>
        <span className="rounded-md border border-border/80 bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">
          {course.category}
        </span>
      </div>

      {/* Body */}
      <div className="relative z-10 flex flex-1 flex-col">
        <h3 className="mb-3 line-clamp-2 min-h-[2.6em] font-display text-base font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
          {course.title}
        </h3>

        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground capitalize">
            {course.level}
          </span>
          <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
            {course.estimated_hours}h
          </span>
          {course.rating >= 4.5 && (
            <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
              Bestseller
            </span>
          )}
          {course.price_cents === 0 && (
            <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
              Free
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-auto flex items-center justify-between pt-3">
        <div className="flex flex-col">
          <span className="font-display font-bold tracking-tight text-foreground text-sm">
            {price}
          </span>
          <span className="text-[11px] text-muted-foreground">Self-paced</span>
        </div>
        <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors group-hover:text-primary-hover">
          <span>View Course</span>
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}
