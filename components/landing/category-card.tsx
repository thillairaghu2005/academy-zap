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

/** Catalog category row. The count is real; the visual treatment stays editorial. */
export function CategoryCard({ name, count, icon: Icon, tone, onSelect }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex min-h-24 min-w-56 flex-1 items-center gap-4 border-b border-border px-1 py-4 text-left outline-none transition-colors duration-200 hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      <Icon className={cn("size-5 shrink-0", tone)} />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-semibold">{name}</span>
        <span className="mt-1 block font-mono text-xs text-muted-foreground">
          {String(count).padStart(2, "0")} courses in catalog
        </span>
      </span>
      <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </button>
  );
}
