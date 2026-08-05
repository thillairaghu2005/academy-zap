"use client";

import * as React from "react";
import Link from "next/link";
import { Clock3, Heart, Star, Users } from "lucide-react";

import type { CourseSummary } from "@/lib/contracts/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FeaturedCourseCardProps {
  course: CourseSummary;
  visualClass: string;
}

/** Catalog-backed course card with local wishlist state until wishlist storage exists. */
export function FeaturedCourseCard({ course, visualClass }: FeaturedCourseCardProps) {
  const [saved, setSaved] = React.useState(false);
  const price = course.price_cents === 0 ? "Free" : `$${(course.price_cents / 100).toFixed(0)}`;

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border/80 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 motion-reduce:transform-none motion-reduce:transition-none">
      <Link href={`/courses/${course.id}`} className="outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className={cn("relative aspect-[1.65] overflow-hidden p-4", visualClass)}>
          <div className="absolute -right-6 -top-8 size-32 rounded-full border-4 border-primary-foreground/20" />
          <div className="absolute bottom-3 left-4 max-w-md">
            <Badge className="mb-2 border-primary-foreground/20 bg-foreground/20 text-primary-foreground backdrop-blur-sm">
              {course.category}
            </Badge>
            <h3 className="font-display text-lg font-bold leading-tight text-primary-foreground drop-shadow-sm">
              {course.title}
            </h3>
          </div>
          <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
            {price}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
          {course.subtitle}
        </p>
        <p className="mt-3 text-xs font-medium text-foreground">{course.instructor_name}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-medium text-warning-strong">
            <Star className="size-3.5 fill-warning" />
            {course.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {course.enrolled_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock3 className="size-3.5" />
            {course.estimated_hours}h
          </span>
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/courses/${course.id}`}>Explore course</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={saved ? `Remove ${course.title} from wishlist` : `Save ${course.title} to wishlist`}
            aria-pressed={saved}
            onClick={() => setSaved((current) => !current)}
            className={cn(saved && "text-danger")}
          >
            <Heart className={cn(saved && "fill-current")} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
