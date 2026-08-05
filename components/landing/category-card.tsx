import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CategoryCardProps {
  name: string;
  count: number;
  icon: LucideIcon;
  tone: string;
  onSelect: () => void;
}

/** Tactile category filter card; content is derived from the course catalog. */
export function CategoryCard({ name, count, icon: Icon, tone, onSelect }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex min-h-36 min-w-52 flex-1 flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left outline-none transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span className={cn("grid size-10 place-items-center rounded-xl text-primary-foreground", tone)}>
        <Icon className="size-5" />
      </span>
      <span className="mt-5 flex items-end justify-between gap-3">
        <span>
          <span className="block font-display text-base font-semibold">{name}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {count} {count === 1 ? "course" : "courses"}
          </span>
        </span>
        <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
