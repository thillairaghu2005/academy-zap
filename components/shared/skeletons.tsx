import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Composed skeleton primitives (build.md F0). Subsystem pages combine these
 * for their loading states so the "data is arriving" treatment is consistent.
 */

export function SkeletonLines({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i % 3 === 1 ? "w-4/5" : i % 3 === 2 ? "w-3/5" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <SkeletonLines count={2} />
    </div>
  );
}

export function SkeletonGrid({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonCourseGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 min-[1440px]:grid-cols-5" role="status" aria-label="Loading courses">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-border bg-card">
          <Skeleton className="h-36 rounded-none" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-5 w-4/5" />
            <SkeletonLines count={2} />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonProblemRows({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading judge problems">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="hidden h-4 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonLabGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading labs">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-border bg-card">
          <Skeleton className="h-32 rounded-none" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-5 w-4/5" />
            <SkeletonLines count={2} />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonLeaderboardRows({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading leaderboard">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPageHeader({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

export function CodeEditorSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading code editor"
      className={cn(
        "flex h-full min-h-64 flex-col overflow-hidden rounded-2xl border border-border bg-surface-1 p-4",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-3 font-mono text-xs">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-3 w-5" />
            <Skeleton
              className={cn(
                "h-3",
                i % 4 === 0 ? "w-3/5" : i % 3 === 0 ? "w-2/5" : "w-4/5",
              )}
            />
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Loading editor…</p>
    </div>
  );
}

export function TerminalSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading lab terminal"
      className={cn(
        "flex h-full min-h-64 flex-col justify-between bg-[#120b0b] p-5",
        className,
      )}
    >
      <div className="space-y-3 font-mono text-xs">
        <Skeleton className="h-3 w-40 bg-white/10" />
        <Skeleton className="h-3 w-64 max-w-full bg-white/10" />
        <Skeleton className="h-3 w-48 max-w-full bg-white/10" />
      </div>
      <p className="text-center text-xs text-white/50">Booting terminal…</p>
    </div>
  );
}
