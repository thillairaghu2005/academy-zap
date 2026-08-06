"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Trophy } from "lucide-react";

import { getProgressContext } from "@/lib/api/gamification";
import { useSession } from "@/components/providers/session-provider";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function RankXpChip({ className }: { className?: string }) {
  const { user, isLoading: sessionLoading } = useSession();
  const userId = user?.id ?? "";
  const query = useQuery({
    queryKey: ["progress-context", userId],
    queryFn: () => getProgressContext(userId),
    enabled: Boolean(userId),
  });

  if (sessionLoading) {
    return <Skeleton className={cn("h-9 w-10 rounded-full sm:w-32", className)} />;
  }
  if (!user) return null;

  const context = query.data;
  return (
    <Link
      href="/rank"
      aria-label={
        context
          ? `${context.rank.rank_name}, view rank and XP progress`
          : "View rank and XP progress"
      }
      className={cn(
        "group flex h-9 items-center gap-2 rounded-full border border-border bg-card px-2.5 outline-none transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:px-3",
        className,
      )}
    >
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Trophy className="size-3" />
      </span>
      {query.isLoading ? (
        <Skeleton className="hidden h-3 w-16 sm:block" />
      ) : context ? (
        <span className="hidden min-w-20 items-center gap-2 sm:flex">
          <span className="truncate text-xs font-semibold">{context.rank.rank_name}</span>
          <Progress
            value={context.rank.rank_progress_pct}
            className="h-1.5 w-12 bg-secondary"
            indicatorClassName="bg-xp-mastery"
            aria-label={`${context.rank.rank_name} rank progress`}
          />
        </span>
      ) : (
        <span className="hidden text-xs text-muted-foreground sm:inline">Rank unavailable</span>
      )}
    </Link>
  );
}
