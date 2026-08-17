"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { m as motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Crown, Shield, Swords, Trophy, Users } from "lucide-react";

import type { GuildVsGuild } from "@/lib/contracts/gamification";
import { getGuildBoard, getGuildVsGuild } from "@/lib/data/demo/gamification";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

const SkillTree = dynamic(
  () => import("@/components/gamification/skill-tree").then((module) => module.SkillTree),
  {
    ssr: false,
    loading: () => <div className="h-[460px] rounded-xl border border-border bg-surface-1" aria-label="Loading skill tree" />,
  },
);

/* ------------------------------------------------------------------ */
/*  Guild board — member rollup + guild-vs-guild (§5.3 GuildRollup).   */
/* ------------------------------------------------------------------ */

export function GuildClient() {
  const { user } = useSession();

  const boardQuery = useQuery({
    queryKey: ["guild-board", user?.id ?? "anonymous"],
    queryFn: () => getGuildBoard(user?.id ?? ""),
    enabled: !!user,
    retry: false,
  });
  const vsQuery = useQuery({
    queryKey: ["guild-vs", user?.id ?? "anonymous"],
    queryFn: () => getGuildVsGuild(user?.id ?? ""),
    enabled: !!user,
    retry: false,
  });

  const board = boardQuery.data;
  const vs = vsQuery.data;

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="font-display text-h1">
          Guild board
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Combined guild XP is the same sum-of-ledger-entries law as individual
          XP — one projection, no separate system.
        </p>
      </div>

      {!user ? (
        <EmptyState
          icon={Users}
          title="Sign in to view your guild"
          description="Guild boards appear once you're signed in."
          primaryAction={
            <Button variant="gradient" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          }
        />
      ) : boardQuery.isLoading ? (
        <div className="space-y-4">
          <SkeletonLines count={5} />
        </div>
      ) : boardQuery.isError || !board ? (
        boardQuery.error instanceof Error && (boardQuery.error as { code?: string }).code === "no_guild" ? (
          <EmptyState icon={Users} title="No guild yet" description="Join a guild to practice with peers and climb the team board." primaryAction={<Button size="sm" asChild><Link href="/courses">Find your path</Link></Button>} secondaryAction={<Button size="sm" variant="outline" onClick={() => boardQuery.refetch()}>Refresh guilds</Button>} />
        ) : <ErrorState title="Guild board unavailable" message={boardQuery.error instanceof Error ? boardQuery.error.message : "The guild service is not responding."} code={boardQuery.error instanceof Error ? (boardQuery.error as { code?: string }).code : undefined} onRetry={() => boardQuery.refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Members + rollup */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-h2">
                  <Shield className="size-5 text-primary" /> {board.name}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {board.member_count} members ·{" "}
                  {board.combined_xp_this_week.toLocaleString()} XP this week ·
                  global rank #{board.guild_rank_global}
                </p>
              </div>
              <Badge variant="secondary" className="text-caption">
                <Trophy className="size-3" /> Top {board.guild_rank_global} guild
              </Badge>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
              {board.members.map((m, i) => (
                <motion.div
                  key={m.user_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "flex items-center gap-4 border-b border-border px-4 py-3 last:border-0",
                    m.is_me && "bg-primary/5",
                  )}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-mono text-xs font-semibold text-muted-foreground">
                    {m.display_name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {m.display_name}
                      {m.is_me ? (
                        <Badge variant="secondary" className="text-caption">
                          you
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {m.rank_name} · level {m.level}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                    {m.xp_this_week.toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right rail: vs comparison + skill tree */}
          <div className="flex flex-col gap-6">
            <GuildVsCard vs={vs} />

            <SkillTree />
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function GuildVsCard({
  vs,
}: {
  vs: GuildVsGuild | null | undefined;
}) {
  if (!vs) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 font-display text-small font-semibold">
          <Swords className="size-4 text-muted-foreground" /> Guild vs guild
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Rival comparison unavailable this week.
        </p>
      </div>
    );
  }

  const g = vs;

  const maxXp = Math.max(
    g.ours.combined_xp_this_week,
    ...g.rivals.map((r) => r.combined_xp_this_week),
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-display text-small font-semibold">
        <Swords className="size-4 text-primary" /> Guild vs guild
      </p>
      <p className="mt-0.5 text-caption text-muted-foreground">
        This week, by combined XP.
      </p>

      <div className="mt-4 space-y-3">
        <VsRow
          name={g.ours.name}
          xp={g.ours.combined_xp_this_week}
          maxXp={maxXp}
          ours
        />
        {g.rivals.map((r) => (
          <VsRow
            key={r.guild_id}
            name={r.name}
            xp={r.combined_xp_this_week}
            maxXp={maxXp}
            delta={r.delta_xp}
          />
        ))}
      </div>
    </div>
  );
}

function VsRow({
  name,
  xp,
  maxXp,
  delta,
  ours = false,
}: {
  name: string;
  xp: number;
  maxXp: number;
  delta?: number;
  ours?: boolean;
}) {
  const pct = maxXp > 0 ? (xp / maxXp) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
          <span className={cn("flex items-center gap-1.5 font-medium", ours && "text-primary")}>
          {ours ? <Crown className="size-3" /> : null}
          {name}
        </span>
        <span className="flex items-center gap-2 font-mono">
          {xp.toLocaleString()}
          {delta !== undefined ? (
            <span
              className={cn(
                "flex items-center gap-0.5 text-caption",
                delta >= 0 ? "text-primary" : "text-emerald-700",
              )}
            >
              <ArrowUpRight
                className={cn("size-3", delta < 0 && "rotate-180")}
              />
              {Math.abs(delta).toLocaleString()}
            </span>
          ) : null}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ width: `${pct}%`, originX: 0 }}
          className={cn(
            "h-full rounded-full",
            ours
              ? "bg-primary"
              : "bg-muted-foreground/40",
          )}
        />
      </div>
    </div>
  );
}
