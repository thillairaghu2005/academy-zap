"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { m as motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Crown, Shield, Swords, Trophy, Users, Zap, Target, Flame, Sparkles } from "lucide-react";

import type { GuildVsGuild } from "@/lib/contracts/gamification";
import { getGuildBoard, getGuildVsGuild } from "@/lib/data/demo/gamification";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { SkeletonGrid, SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

const SkillTree = dynamic(
  () => import("@/components/gamification/skill-tree").then((module) => module.SkillTree),
  {
    ssr: false,
    loading: () => <div className="h-[460px] rounded-2xl border border-border/50 bg-surface-1/30 backdrop-blur-xl animate-pulse" aria-label="Loading skill tree" />,
  },
);

const SkillRadar = dynamic(
  () => import("@/components/gamification/skill-radar").then((module) => module.SkillRadar),
  { ssr: false },
);

export function GuildClient() {
  const { user } = useSession();
  const reducedMotion = useReducedMotion() ?? false;

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
    <div className="min-h-screen bg-background selection:bg-primary/30 pb-20">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden border-b border-border/40 bg-surface-1/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-20 [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />
        
        <PageContainer className="relative py-16 sm:py-24">
           {!user ? (
             <div className="flex max-w-3xl flex-col gap-6">
                <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary backdrop-blur-sm shadow-sm transition-colors hover:bg-primary/10">
                  <Shield className="mr-1.5 size-3.5" />
                  Guild System
                </Badge>
                <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  Collaborate and <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Conquer</span>
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground/90 sm:text-lg max-w-2xl">
                  Join a guild to combine XP, compete against rival factions, and unlock exclusive skill tree projections.
                </p>
             </div>
           ) : board ? (
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
               <motion.div
                 initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                 animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, ease: "easeOut" }}
                 className="flex flex-col gap-5"
               >
                 <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary backdrop-blur-sm shadow-sm transition-colors hover:bg-primary/10">
                   <Trophy className="mr-1.5 size-3.5" />
                   Global Rank #{board.guild_rank_global}
                 </Badge>
                 <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl flex items-center gap-3">
                   <div className="p-2 sm:p-3 bg-primary/10 rounded-xl border border-primary/20 text-primary shadow-lg shadow-primary/5">
                     <Shield className="size-8 sm:size-10" />
                   </div>
                   {board.name}
                 </h1>
               </motion.div>

               <motion.div 
                 initial={reducedMotion ? false : { opacity: 0, x: 20 }}
                 animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
                 transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                 className="flex gap-6 sm:gap-8 p-6 rounded-2xl bg-background/50 border border-border/50 backdrop-blur-md shadow-sm"
               >
                 <div className="flex flex-col gap-1.5">
                   <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Weekly XP</span>
                   <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tighter text-foreground flex items-center gap-2">
                     <Zap className="size-5 text-primary" fill="currentColor" />
                     {board.combined_xp_this_week.toLocaleString()}
                   </span>
                 </div>
                 <div className="w-px bg-border/50" />
                 <div className="flex flex-col gap-1.5">
                   <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Members</span>
                   <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tighter text-foreground flex items-center gap-2">
                     <Users className="size-5 text-muted-foreground" />
                     {board.member_count}
                   </span>
                 </div>
               </motion.div>
             </div>
           ) : (
             <div className="flex max-w-3xl flex-col gap-6">
                <SkeletonLines count={3} />
             </div>
           )}
        </PageContainer>
      </div>

      <PageContainer className="py-12">
        {!user ? (
          <EmptyState
            icon={Users}
            title="Sign in to view your guild"
            description="Guild boards appear once you're signed in."
            primaryAction={
              <Button size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            }
          />
        ) : boardQuery.isLoading ? (
          <div className="space-y-8">
            <SkeletonGrid count={3} />
          </div>
        ) : boardQuery.isError || !board ? (
          boardQuery.error instanceof Error && (boardQuery.error as { code?: string }).code === "no_guild" ? (
            <EmptyState icon={Users} title="No guild yet" description="Join a guild to practice with peers and climb the team board." primaryAction={<Button size="sm" asChild><Link href="/courses">Find your path</Link></Button>} secondaryAction={<Button size="sm" variant="outline" onClick={() => boardQuery.refetch()}>Refresh guilds</Button>} />
          ) : <ErrorState title="Guild board unavailable" message={boardQuery.error instanceof Error ? boardQuery.error.message : "The guild service is not responding."} code={boardQuery.error instanceof Error ? (boardQuery.error as { code?: string }).code : undefined} onRetry={() => boardQuery.refetch()} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Main Column: Members + New Features */}
            <div className="lg:col-span-8 flex flex-col gap-10">
              
              {/* NEW FEATURE: Weekly Objectives */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Target className="size-4" />
                    Weekly Objectives
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Card className="relative overflow-hidden border border-border/50 bg-background/50 backdrop-blur-xl p-5 hover:border-primary/50 transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                      <Flame className="size-16 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base mb-1.5">XP Surge</h3>
                    <p className="text-xs text-muted-foreground mb-6">Reach 50,000 combined XP</p>
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{board.combined_xp_this_week.toLocaleString()} / 50,000</span>
                        <span className="text-primary">{Math.min(100, Math.round((board.combined_xp_this_week / 50000) * 100))}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" style={{ width: `${Math.min(100, (board.combined_xp_this_week / 50000) * 100)}%` }} />
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="relative overflow-hidden border border-border/50 bg-background/50 backdrop-blur-xl p-5 hover:border-primary/50 transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                      <Swords className="size-16 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base mb-1.5">Rival Dominance</h3>
                    <p className="text-xs text-muted-foreground mb-6">Defeat top rival by 10% XP</p>
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>In Progress</span>
                        <span className="text-amber-500 flex items-center gap-1"><Target className="size-3"/> Active</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-amber-500 w-[65%] transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                      </div>
                    </div>
                  </Card>
                </div>
              </section>

              {/* Members Roster */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Users className="size-4" />
                    Guild Roster
                  </h2>
                  <Badge variant="secondary" className="bg-surface-1 text-xs px-3 py-1 font-medium">
                    {board.members.length} Members
                  </Badge>
                </div>
                
                <Card className="overflow-hidden border border-border/50 bg-background/50 backdrop-blur-xl divide-y divide-border/40 shadow-sm">
                  {board.members.map((m, i) => (
                    <motion.div
                      key={m.user_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "group flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-1/50",
                        m.is_me && "bg-primary/5 hover:bg-primary/10",
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-surface-1 to-secondary font-mono text-xs font-bold text-foreground border border-border/50 shadow-sm group-hover:border-primary/30 transition-colors">
                            {m.display_name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          {m.is_me && (
                            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground border border-background shadow-sm">
                              <Sparkles className="size-2.5" />
                            </span>
                          )}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 truncate text-sm font-semibold text-foreground/90 group-hover:text-foreground">
                            {m.display_name}
                            {m.is_me && (
                              <Badge variant="secondary" className="text-[9px] uppercase tracking-wider py-0 px-1.5 h-4.5 bg-primary/20 text-primary border-0 font-bold">
                                You
                              </Badge>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-medium">
                            <span className="text-foreground/70">{m.rank_name}</span>
                            <span className="size-1 rounded-full bg-border" />
                            <span>Level {m.level}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-0.5 shrink-0 mt-2 sm:mt-0">
                        <span className="font-mono text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                          {m.xp_this_week.toLocaleString()} <span className="text-[9px] text-muted-foreground uppercase font-sans font-bold">XP</span>
                        </span>
                        <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                          This Week
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </Card>
              </section>
            </div>

            {/* Right rail: vs comparison + skill tree */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <GuildVsCard vs={vs} />

              <SkillRadar />
              <SkillTree />
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
}

function GuildVsCard({
  vs,
}: {
  vs: GuildVsGuild | null | undefined;
}) {
  if (!vs) {
    return (
      <Card className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl p-6 shadow-sm">
        <p className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide">
          <Swords className="size-4 text-muted-foreground" /> Guild vs Guild
        </p>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Rival comparison unavailable this week.
        </p>
      </Card>
    );
  }

  const g = vs;
  const maxXp = Math.max(
    g.ours.combined_xp_this_week,
    ...g.rivals.map((r) => r.combined_xp_this_week),
  );

  return (
    <Card className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl p-6 shadow-[0_8px_40px_-12px_rgba(var(--primary-rgb),0.05)]">
      <div className="flex items-center justify-between mb-1">
        <p className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide">
          <Swords className="size-4 text-primary" /> Guild vs Guild
        </p>
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-muted-foreground border-border/50">Live</Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-8 font-medium">
        This week, by combined XP.
      </p>

      <div className="space-y-6">
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
    </Card>
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
    <div className="group">
      <div className="flex items-end justify-between text-sm mb-2.5">
        <span className={cn("flex items-center gap-2.5 font-semibold text-sm", ours ? "text-primary" : "text-foreground/90")}>
          {ours ? (
            <div className="p-1.5 rounded-lg bg-primary/10 shadow-sm">
              <Crown className="size-3.5 text-primary" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-surface-1 shadow-sm border border-border/50">
              <Shield className="size-3.5 text-muted-foreground" />
            </div>
          )}
          {name}
        </span>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-2 font-mono font-bold tracking-tight">
            {xp.toLocaleString()}
          </span>
          {delta !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider",
                delta >= 0 ? "text-primary" : "text-emerald-500",
              )}
            >
              <ArrowUpRight
                className={cn("size-3", delta < 0 && "rotate-180")}
              />
              {Math.abs(delta).toLocaleString()} XP {delta >= 0 ? 'Behind' : 'Ahead'}
            </span>
          )}
        </div>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary/60">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
          style={{ width: `${pct}%`, originX: 0 }}
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            ours
              ? "bg-gradient-to-r from-primary/80 to-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.6)]"
              : "bg-muted-foreground/40",
          )}
        />
      </div>
    </div>
  );
}
