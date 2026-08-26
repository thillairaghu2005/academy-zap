import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { NoiseOverlay } from "@/components/ui/noise-overlay";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** @deprecated Use primaryAction for new surfaces. */
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
  primaryAction,
  secondaryAction,
  action,
  className,
}: EmptyStateProps) {
  const primary = primaryAction ?? action;
  return (
    <div
      className={cn(
        "relative flex animate-fade-up flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-2 px-6 py-14 text-center",
        className,
      )}
    >
      <NoiseOverlay className="opacity-30" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 left-1/2 size-48 -translate-x-1/2 rounded-full bg-ink-muted/10 blur-3xl"
      />
      {Icon ? (
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="relative mb-4 grid size-14 place-items-center rounded-2xl border border-border bg-gradient-to-b from-surface-hover to-surface-2 text-ink shadow-sm"
        >
          <Icon className="size-6" />
        </motion.div>
      ) : null}
      <h3 className="relative font-display text-h3">{title}</h3>
      {description ? (
        <p className="relative mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {primary || secondaryAction ? (
        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
          {primary}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
