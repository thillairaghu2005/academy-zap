"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { m as motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Globe,
  Medal,
  Trophy,
} from "lucide-react";

import { getLeaderboard, getMyStanding } from "@/lib/data/demo/gamification";
import type { LeaderboardScope } from "@/lib/contracts/gamification";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";
import { SkeletonLeaderboardRows } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const RANK_STYLE: Record<number, string> = {
  1: "bg-amber-400 text-amber-950",
  2: "bg-slate-300 text-slate-900",
  3: "bg-orange-400 text-orange-950",
};

export function LeaderboardClient() {
  const { user } = useSession();
  const [scope, setScope] = React.useState<LeaderboardScope>("global");
  const [offset, setOffset] = React.useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["leaderboard", scope, offset],
    queryFn: () =>
      getLeaderboard(scope, offset, user?.id ?? "", user?.display_name ?? "You"),
    retry: false,
  });

  const standingQuery = useQuery({
    queryKey: ["my-standing", scope],
    queryFn: () =>
      getMyStanding(scope, user?.id ?? "", user?.display_name ?? "You"),
    enabled: !!user,
    retry: false,
  });

  const entries = data?.entries ?? [];
  const me = standingQuery.data;

  const switchScope = (next: LeaderboardScope) => {
    setScope(next);
    setOffset(0);
  };

  return (
    <PageContainer>
      <div className="mb-8">
                <h1 className="font-display text-h1">
          Leaderboards
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Redis sorted-set reads (ZRANGE-shaped). Ranks are derived from the
          append-only demo ledger — this page only renders the score
          you were given.
        </p>
        <div className="mt-4 inline-flex overflow-hidden rounded-lg border border-border">
          <button
            onClick={() => switchScope("global")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors",
              scope === "global"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Globe className="size-3.5" /> Global
          </button>
          <button
            onClick={() => switchScope("guild")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors",
              scope === "guild"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Medal /> Guild
          </button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonLeaderboardRows count={6} />
      ) : isError ? (
        <ErrorState
          title="Could not load leaderboard"
          message="The leaderboard projection is unreachable right now."
          code="leaderboard_unreachable"
          onRetry={() => refetch()}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No leaderboard ranking yet"
          description="Complete a course, solve a Judge problem, or finish a lab to earn your first public ranking."
          primaryAction={<Button size="sm" asChild><Link href="/courses">Start learning</Link></Button>}
          secondaryAction={<Button size="sm" variant="outline" asChild><Link href="/rank">View rank ladder</Link></Button>}
        />
      ) : (
        <>
          {/* Pinned standing — ZRANK-shaped, always visible. */}
          {me ? (
            <div className="mb-4 flex items-center gap-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-mono text-xs font-bold text-primary-foreground">
                #{me.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {me.display_name}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    · {me.rank_name} · level {me.level}
                  </span>
                </p>
                <p className="text-caption text-muted-foreground">
                  Your standing on the {scope} board
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                {me.score.toLocaleString()}
              </span>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {entries.map((e, i) => {
              const medal = RANK_STYLE[e.rank];
              return (
                <motion.div
                  key={e.user_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "flex items-center gap-4 border-b border-border px-4 py-3 last:border-0",
                    e.is_me && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold",
                      medal ?? "bg-secondary text-muted-foreground",
                    )}
                  >
                    {e.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {e.display_name}
                      {e.is_me ? (
                        <Badge variant="secondary" className="text-caption">
                          you
                        </Badge>
                      ) : null}
                      {e.rank === 1 ? (
                        <Crown className="size-3.5 text-warning-strong" />
                      ) : null}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {e.rank_name}
                      {e.prestige_tier > 0 ? ` · prestige ${e.prestige_tier}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                    {e.score.toLocaleString()}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* ZRANGE cursor pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {data?.total ? `${data.total.toLocaleString()} ranked` : ""} ·{" "}
              {offset + 1}–{Math.min(offset + PAGE_SIZE, data?.total ?? 0)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                <ChevronLeft /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.has_more}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Next <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
