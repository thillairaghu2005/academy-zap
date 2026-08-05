"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown, Gem, Gift, Lock, Ticket } from "lucide-react";

import { getSeasonPass } from "@/lib/api/gamification";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Season Pass track (gamification doc §6 — lower-priority surface).  */
/*  Free + premium milestones keyed off xp_this_season; billing is a    */
/*  separate platform concern — the engine only reports progress.       */
/* ------------------------------------------------------------------ */

export function SeasonPassCard() {
  const { user } = useSession();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["season-pass", user?.id ?? "anonymous"],
    queryFn: () => getSeasonPass(user?.id ?? ""),
    enabled: !!user,
    retry: false,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <SkeletonLines count={3} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
        Season pass unavailable right now.
      </div>
    );
  }

  const overall =
    data.milestones.length > 0
      ? data.milestones.reduce((s, m) => s + m.progress, 0) /
        data.milestones.length
      : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-violet-500/5 via-card to-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-violet-500/15 text-violet-600">
            <Ticket className="size-4" />
          </span>
          <div>
            <p className="font-display text-small font-bold">
              {data.season_name}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {data.xp_this_season.toLocaleString()} XP this season
            </p>
          </div>
        </div>
        {data.premium_owned ? (
          <Badge className="border-violet-500/40 bg-violet-500/10 text-violet-600">
            <Crown className="size-3" /> Premium track
          </Badge>
        ) : (
          <Badge variant="outline" className="text-caption">
            Free track
          </Badge>
        )}
      </div>

      <div className="px-5 py-4">
        {/* Milestone nodes */}
        <div className="relative flex items-start justify-between gap-1">
          <div className="absolute left-4 right-4 top-3.5 h-0.5 rounded bg-secondary" />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overall * 100}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute left-4 top-3.5 h-0.5 rounded bg-gradient-to-r from-violet-500 to-fuchsia-500"
          />
          {data.milestones.map((m) => {
            const reached = m.progress >= 1;
            return (
              <div key={m.milestone} className="relative z-10 flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full border-2 bg-card transition-colors",
                    reached
                      ? "border-violet-500 bg-violet-500 text-white"
                      : m.premium
                        ? "border-amber-500/60 text-amber-700"
                        : "border-secondary text-muted-foreground",
                  )}
                >
                  {reached ? (
                    <Gift className="size-3.5" />
                  ) : m.premium ? (
                    <Gem className="size-3.5" />
                  ) : (
                    <span className="text-caption font-bold">{m.milestone}</span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-center text-caption font-medium leading-tight",
                    reached
                      ? "text-violet-600"
                      : "text-muted-foreground",
                  )}
                >
                  {m.reward}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-0.5 font-mono text-[9px]",
                    reached ? "text-muted-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {m.premium ? <Lock className="size-2.5" /> : null}
                  {m.required_season_xp.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-caption leading-relaxed text-muted-foreground">
          Milestones unlock by season XP — the engine only reports progress;
          premium-track billing is a separate platform concern.
        </p>
      </div>
    </div>
  );
}
