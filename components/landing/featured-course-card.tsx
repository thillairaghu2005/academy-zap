"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, Heart } from "lucide-react";

import type { CourseSummary } from "@/lib/contracts/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FeaturedCourseCardProps {
  course: CourseSummary;
  visualClass: string;
  index: number;
}

/** Editorial course row: useful course information, no simulated social-proof stack. */
export function FeaturedCourseCard({ course, visualClass, index }: FeaturedCourseCardProps) {
  const [saved, setSaved] = React.useState(false);
  const cta = course.price_cents === 0
    ? "Start free"
    : course.category === "Cybersecurity"
      ? "Open syllabus"
      : "View course";
  const price = course.price_cents === 0 ? "FREE" : `$${(course.price_cents / 100).toFixed(0)}`;

  return (
    <article className="group border-t border-border py-5 transition-colors duration-200 hover:border-foreground motion-reduce:transition-none">
      <Link href={`/courses/${course.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className={cn("relative flex aspect-[1.8] items-end overflow-hidden p-4", visualClass)}>
          <span className="absolute right-4 top-4 font-mono text-xs text-primary-foreground/70">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="absolute -right-8 -top-10 size-36 rounded-full border-4 border-primary-foreground/20" />
          <div className="relative max-w-md">
            <Badge className="border-primary-foreground/20 bg-foreground/20 font-mono text-[10px] uppercase text-primary-foreground backdrop-blur-sm">
              {course.category}
            </Badge>
            <h3 className="mt-3 font-display text-h3 text-primary-foreground">
              {course.title}
            </h3>
          </div>
        </div>
      </Link>

      <div className="pt-4">
        <p className="line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
          {course.subtitle}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-muted-foreground">
          <span className="text-foreground">{course.instructor_name}</span>
          <span>{course.level}</span>
          <span className="flex items-center gap-1">
            <Clock3 className="size-3.5" /> {course.estimated_hours}h
          </span>
          <span className="text-foreground">{price}</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="link" className="h-auto p-0 font-semibold" asChild>
            <Link href={`/courses/${course.id}`}>
              {cta} <ArrowUpRight />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={saved ? `Remove ${course.title} from wishlist` : `Save ${course.title} to wishlist`}
            aria-pressed={saved}
            onClick={() => setSaved((current) => !current)}
            className={cn("ml-auto", saved && "text-danger")}
          >
            <Heart className={cn(saved && "fill-current")} />
          </Button>
        </div>
      </div>
    </article>
  );
}
