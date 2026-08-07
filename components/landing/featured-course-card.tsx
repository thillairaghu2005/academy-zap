"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Bookmark, BookmarkCheck, Clock3, Star, Users } from "lucide-react";

import type { CourseSummary } from "@/lib/contracts/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FeaturedCourseCardProps {
  course: CourseSummary;
  visualClass: string;
  index: number;
}

export function FeaturedCourseCard({ course, visualClass, index }: FeaturedCourseCardProps) {
  const [saved, setSaved] = React.useState(false);
  const price = course.price_cents === 0 ? "Free" : `$${(course.price_cents / 100).toFixed(0)}`;

  return (
    <article className="group overflow-hidden rounded-3xl border border-border bg-card shadow-[0_8px_24px_rgb(17_24_39_/_5%)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_18px_44px_rgb(17_24_39_/_10%)]">
      <Link href={`/courses/${course.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className={cn("relative flex aspect-[1.8] items-end overflow-hidden p-5", visualClass)}>
          <div className="absolute inset-0 aurora opacity-75 transition-transform duration-700 group-hover:scale-105" aria-hidden="true" />
          <div className="absolute inset-0 bg-grid opacity-60" aria-hidden="true" />
          <span className="absolute right-5 top-5 font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
          <div className="relative">
            <Badge variant="outline" className="border-primary/20 bg-white/80 text-primary backdrop-blur-sm">{course.category}</Badge>
            <h3 className="mt-3 max-w-md font-display text-h3 font-semibold text-foreground">{course.title}</h3>
          </div>
        </div>
      </Link>

      <div className="p-5">
        <p className="line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">{course.subtitle}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{course.instructor_name}</span>
          <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-primary text-primary" /> {course.rating > 0 ? course.rating.toFixed(1) : "New"}</span>
          <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {course.enrolled_count.toLocaleString()}</span>
          <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> {course.estimated_hours}h</span>
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
          <Button variant="link" className="h-auto p-0 font-semibold" asChild>
            <Link href={`/courses/${course.id}`}>View course <ArrowUpRight /></Link>
          </Button>
          <span className="ml-auto font-display text-h3 font-semibold">{price}</span>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={saved ? `Remove ${course.title} from saved courses` : `Save ${course.title}`} aria-pressed={saved} onClick={() => setSaved((current) => !current)} className={cn(saved && "text-primary")}>
            {saved ? <BookmarkCheck className="fill-primary/10" /> : <Bookmark />}
          </Button>
        </div>
      </div>
    </article>
  );
}
