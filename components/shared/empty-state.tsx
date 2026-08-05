import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Global empty-state primitive (build.md F0). Every surface reuses this for
 * its "no data yet" state so the empty treatment is identical platform-wide.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex animate-fade-up flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 grid size-12 place-items-center rounded-full border border-border bg-secondary text-muted-foreground">
          <Icon className="size-5" />
        </div>
      ) : null}
      <h3 className="font-display text-h3">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
