"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  Crown,
  Medal,
  Shield,
  Trophy,
  Users,
} from "lucide-react";

import {
  getPublicGuildBoard,
  getPublicLeaderboardPreview,
  getRankLadder,
} from "@/lib/data/demo/gamification";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SocialProofSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5 sm:p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-5 h-12 w-full" />
        <Skeleton className="mt-2 h-12 w-full" />
        <Skeleton className="mt-2 h-12 w-full" />
      </Card>
      <Card className="p-5 sm:p-6">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-5 h-20 w-full" />
        <Skeleton className="mt-4 h-4 w-3/4" />
      </Card>
      <Card className="p-5 sm:p-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-5 h-8 w-full" />
        <Skeleton className="mt-2 h-8 w-full" />
        <Skeleton className="mt-2 h-8 w-full" />
      </Card>
    </div>
  );
}

export function SocialProof() {
  const leaderboardQuery = useQuery({
    queryKey: ["public-leaderboard-preview"],
    queryFn: getPublicLeaderboardPreview,
  });
  const guildQuery = useQuery({
    queryKey: ["public-guild-board"],
    queryFn: getPublicGuildBoard,
  });
  const ladderQuery = useQuery({
    queryKey: ["public-rank-ladder"],
    queryFn: getRankLadder,
  });

  const loading =
    leaderboardQuery.isLoading || guildQuery.isLoading || ladderQuery.isLoading;
  if (loading) {
    return (
      <section className="bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <SectionIntro />
          <div className="mt-8">
            <SocialProofSkeleton />
          </div>
        </div>
      </section>
    );
  }

  const entries = leaderboardQuery.data?.entries.slice(0, 5) ?? [];
  const guild = guildQuery.data;
  const ladder = ladderQuery.data?.slice(0, 5) ?? [];

  return (
    <section className="bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <SectionIntro />
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
              <div>
                <p className="flex items-center gap-2 font-display text-h3">
                   <Trophy className="size-5 text-primary" /> Global climb
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The top of this week&apos;s demo leaderboard.
                </p>
              </div>
              <Link
                href="/leaderboards"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                See full leaderboard <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {entries.length > 0 ? (
              <div>
                {entries.map((entry) => (
                  <div
                    key={entry.user_id}
                    className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-0 sm:px-6"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-mono text-xs font-semibold text-muted-foreground">
                      {entry.rank === 1 ? (
                        <Crown className="size-4 text-amber-700" />
                      ) : (
                        entry.rank
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{entry.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.rank_name} · level {entry.level}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold tabular-nums text-foreground/80">
                      {entry.score.toLocaleString()} XP
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">The board is warming up.</div>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-display text-h3">
                   <Medal className="size-5 text-primary" /> Rank ladder
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ten server-resolved levels from Initiate to Deus.
                </p>
              </div>
              <Link
                href="/rank"
                className="text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                View <ArrowRight className="inline size-3.5" />
              </Link>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              {ladder.map((rank) => (
                <div key={rank.level} className="flex items-center gap-3 text-xs">
                  <span className="grid size-6 place-items-center rounded-md bg-secondary font-mono text-caption text-muted-foreground">
                    {rank.level}
                  </span>
                  <span className="font-medium">{rank.rank_name}</span>
                  <span className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                    <span
                       className="block h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(20, rank.level * 18)}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            {guild ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 font-display text-h3">
                      <Shield className="size-5 text-primary" /> {guild.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Top {guild.guild_rank_global} guild this week</p>
                  </div>
                  <Medal className="size-5 text-primary" />
                </div>
                <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs text-muted-foreground">Guild momentum</p>
                  <p className="mt-1 font-display text-3xl">{guild.combined_xp_this_week.toLocaleString()}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-primary">XP this week</p>
                </div>
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Users className="size-3.5" /> {guild.member_count} members</span>
                  <Link
                    href="/guilds"
                    className="inline-flex items-center gap-1 font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Enter guilds <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Guild projections are refreshing.</p>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}

function SectionIntro() {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Proof, not promises</p>
        <h2
          className="mt-3 text-h2"
          style={{ fontFamily: "'Geist Variable', sans-serif", fontWeight: 100, letterSpacing: "-0.03em" }}
        >See who is climbing with you.</h2>
      </div>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
        Live-feeling projections make the loop social: individual progress has
        a board, and every guild has a crew pushing the week forward.
      </p>
    </div>
  );
}
