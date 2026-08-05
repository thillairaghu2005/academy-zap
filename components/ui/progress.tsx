"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentProps<"div"> {
  /** 0-100 */
  value?: number;
  indicatorClassName?: string;
}

/**
 * Minimal progress bar primitive (F1). Plain div — no animation library
 * needed; the shell's shared surfaces use it for enrollment progress.
 */
function Progress({
  value = 0,
  indicatorClassName,
  className,
  ...props
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-500 ease-out",
          indicatorClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
