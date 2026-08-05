"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Flame,
  GitFork,
  Medal,
  ShieldAlert,
  Sparkles,
  Swords,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import type {
  LeagueStanding,
  StreakState,
} from "@/lib/contracts/gamification";
import {
  getLeagueStanding,
  getProgressContext,
  getRankLadder,
  getStreak,
} from "@/lib/api/gamification";
import { DEMO_MODE } from "@/lib/config";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";
import { SkeletonLines } from "@/components/shared/skeletons";
import { ShareCardModal } from "@/components/gamification/share-card-modal";
import { SeasonPassCard } from "@/components/gamification/season-pass-card";
import { LedgerViewer } from "@/components/gamification/ledger-viewer";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Rank hub — the ProgressContext surface. Every number is derived    */
/*  server-side (lib/api/gamification → mock ledger); the client only  */
/*  renders what the context exposes (§5.1 "one frozen object").       */
/* ------------------------------------------------------------------ */

const DEMO_USERS = [
  { id: "4c1e0a9f-8c6e-4b2d-9f3a-2b8d1e5c7a91", label: "Live" },
  { id: "frozen-demo", label: "Frozen" },
  { id: "boom", label: "Error" },
  { id: "missing-user", label: "Empty" },
] as const;

const LEAGUE_TIER_STYLE: Record<string, string> = {
  bronze: "border-orange-700/40 bg-orange-700/10 text-orange-700",
  silver: "border-slate-400/40 bg-slate-400/10 text-slate-500",
  gold: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  platinum: "border-cyan-500/40 bg-cyan-500/10 text-cyan-700",
  obsidian: "border-violet-600/40 bg-violet-600/10 text-violet-600",
};

export function RankHubClient() {
  const { user } = useSession();
  const router = useRouter();
  const [demoUser, setDemoUser] = React.useState<string>(user?.id ?? "4c1e0a9f-8c6e-4b2d-9f3a-2b8d1e5c7a91");
  const [shareOpen, setShareOpen] = React.useState(false);
  const [ledgerOpen, setLedgerOpen] = React.useState(false);

  const ctxQuery = useQuery({
    queryKey: ["progress-context", demoUser],
    queryFn: () => getProgressContext(demoUser),
    retry: false,
  });
  const ladderQuery = useQuery({
    queryKey: ["rank-ladder"],
    queryFn: () => getRankLadder(),
  });
  const streakQuery = useQuery({
    queryKey: ["streak", demoUser],
    queryFn: () => getStreak(demoUser),
    retry: false,
  });
  const leagueQuery = useQuery({
    queryKey: ["league", demoUser],
    queryFn: () => getLeagueStanding(demoUser),
    retry: false,
  });

  const ctx = ctxQuery.data;
  const ladder = ladderQuery.data;

  return (
    <PageContainer>
      {/* Demo-state switcher — demos the four required states. Gated: it's
          demo scaffolding and never renders in a production-shaped build. */}
      {DEMO_MODE ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
            Demo state
          </span>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {DEMO_USERS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDemoUser(d.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  demoUser === d.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {ctxQuery.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <SkeletonLines count={4} />
          </div>
        </div>
      ) : ctxQuery.isError || !ctx ? (
        <ErrorState
          title={
            ctxQuery.error instanceof Error
              ? (ctxQuery.error as { code?: string }).code === "gamification_down"
                ? "Gamification engine unreachable"
                : "No progress context yet"
              : "No progress context yet"
          }
          message={
            ctxQuery.error instanceof Error
              ? ctxQuery.error.message
              : "This learner has no gamification data yet."
          }
          code={
            ctxQuery.error instanceof Error
              ? (ctxQuery.error as { code?: string }).code
              : undefined
          }
          onRetry={() => ctxQuery.refetch()}
        />
      ) : (
        <>
          {/* Frozen banner — edge case: public display frozen, XP still accrues. */}
          {ctx.freeze_status === "frozen_pending_review" ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
            >
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" />
              <div>
                <p className="font-display text-small font-semibold text-amber-700">
                  Progress frozen pending review
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {ctx.unresolved_flags.join(", ")}. Your private progress still
                  accrues — only public rank/leaderboard visibility is paused
                  until the review clears.
                </p>
              </div>
            </motion.div>
          ) : null}

          {/* Hero rank card + right rail */}
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-fuchsia-500/10 via-card to-card p-6 shadow-sm"
            >
              <div className="absolute -right-16 -top-16 size-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy className="size-5 text-fuchsia-600" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Current rank
                    </span>
                  </div>
                  <h1 className="mt-2 font-display text-h1">
                    {ctx.rank.rank_name}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Level {ctx.rank.level}</Badge>
                    {ctx.rank.prestige_tier > 0 ? (
                      <Badge className="border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-600">
                        <Sparkles className="size-3" /> Prestige{" "}
                        {ctx.rank.prestige_tier}
                      </Badge>
                    ) : null}
                    {ctx.rank.specialization_tag ? (
                      <Badge variant="outline">
                        <GitFork className="size-3" /> {ctx.rank.specialization_tag}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    ctx v{ctx.context_version} ·{" "}
                    {new Date(ctx.computed_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLedgerOpen(true)}
                    >
                      <BookOpen /> Ledger
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShareOpen(true)}
                      disabled={ctx.freeze_status === "frozen_pending_review"}
                    >
                      <Sparkles /> Share rank card
                    </Button>
                  </div>
                  {ctx.freeze_status === "frozen_pending_review" ? (
                    <p className="text-caption text-muted-foreground">
                      Frozen — share disabled pending review
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Dual XP tracks — never blended (§5.2). */}
              <DualXpTracks completion={ctx.rank.completion_xp} mastery={ctx.rank.mastery_xp} />

              {/* Percentile strip */}
              <div className="relative mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat label="Global percentile" value={`${ctx.rank.percentile_global}%`} />
                <Stat
                  label="Cohort percentile"
                  value={ctx.rank.percentile_cohort === null ? "—" : `${ctx.rank.percentile_cohort}%`}
                />
                <Stat label="Context version" value={`v${ctx.context_version}`} />
              </div>
            </motion.div>

            {/* Right rail: streak + league + guild */}
            <div className="flex flex-col gap-4">
              <StreakWidget
                data={streakQuery.data}
                isLoading={streakQuery.isLoading}
                isError={streakQuery.isError}
                onRetry={() => streakQuery.refetch()}
              />
              <LeagueWidget
                data={leagueQuery.data}
                isLoading={leagueQuery.isLoading}
                isError={leagueQuery.isError}
                onRetry={() => leagueQuery.refetch()}
              />
              <GuildWidget guild={ctx.guild} />
            </div>
          </div>

          {/* Season pass track */}
          <div className="mt-10">
            <SeasonPassCard />
          </div>

          {/* Rank ladder */}
          <div className="mt-10">
            <RankLadderSection
              ladder={ladder ?? []}
              currentLevel={ctx.rank.level}
              currentPrestige={ctx.rank.prestige_tier}
              isLoading={ladderQuery.isLoading}
            />
          </div>

          {/* Quick links */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <QuickLink
              icon={TrendingUp}
              title="Leaderboards"
              subtitle="Global & guild, ZRANGE-shaped"
              onClick={() => router.push("/leaderboards")}
            />
            <QuickLink
              icon={Medal}
              title="Badge wall"
              subtitle="Verified, flagged & revoked"
              onClick={() => router.push("/rank/badges")}
            />
            <QuickLink
              icon={Swords}
              title="Guild board"
              subtitle="Combined XP & rival guilds"
              onClick={() => router.push("/guilds")}
            />
          </div>
        </>
      )}

      <ShareCardModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        userId={demoUser === "boom" || demoUser === "missing-user" ? "4c1e0a9f-8c6e-4b2d-9f3a-2b8d1e5c7a91" : demoUser}
      />
      <LedgerViewer
        open={ledgerOpen}
        onOpenChange={setLedgerOpen}
        userId={demoUser === "boom" || demoUser === "missing-user" ? "4c1e0a9f-8c6e-4b2d-9f3a-2b8d1e5c7a91" : demoUser}
      />
    </PageContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Dual XP tracks                                                     */
/* ------------------------------------------------------------------ */

function DualXpTracks({
  completion,
  mastery,
}: {
  completion: number;
  mastery: number;
}) {
  // Bars are visual only — the weighted rank was derived server-side.
  const total = completion + mastery || 1;
  const cPct = (completion / total) * 100;
  const mPct = (mastery / total) * 100;
  return (
    <div className="relative mt-8 space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-sky-700">
          <BookOpen className="size-3.5" /> Completion XP
        </span>
        <span className="font-mono text-muted-foreground">
          {completion.toLocaleString()} · {cPct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sky-500/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${cPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-500"
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-fuchsia-600">
          <Sparkles className="size-3.5" /> Mastery XP
        </span>
        <span className="font-mono text-muted-foreground">
          {mastery.toLocaleString()} · {mPct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-fuchsia-500/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${mPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500"
        />
      </div>
      <p className="text-caption text-muted-foreground">
        Two independent tracks, never blended — rank is a weighted function of
        both, with the weights owned by the server.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 px-3 py-2.5">
      <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-lg font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Streak widget                                                      */
/* ------------------------------------------------------------------ */

function StreakWidget({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: StreakState | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const streak = data;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-small font-semibold">
          <Flame className="size-4 text-orange-700" />
          Streak
        </p>
        {!isLoading && !isError && streak ? (
          <Badge
            variant={
              streak.status === "active"
                ? "secondary"
                : streak.status === "grace_period"
                  ? "outline"
                  : "destructive"
            }
            className="text-caption"
          >
            {streak.status.replace("_", " ")}
          </Badge>
        ) : null}
      </div>
      {isLoading ? (
        <div className="mt-3">
          <SkeletonLines count={2} />
        </div>
      ) : isError || !streak ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Streak unavailable.
          <button onClick={onRetry} className="ml-1 underline underline-offset-2">
            Retry
          </button>
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-end gap-2">
            <motion.span
              key={streak.current_streak_days}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display text-h2"
            >
              {streak.current_streak_days}
            </motion.span>
            <span className="pb-0.5 text-xs text-muted-foreground">
              days · best {streak.longest_streak_days}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-caption">
            <span className="rounded-md bg-orange-500/10 px-2 py-1 font-medium text-orange-700">
              ×{streak.momentum_multiplier.toFixed(2)} momentum
            </span>
            <span className="rounded-md bg-secondary px-2 py-1 font-medium text-muted-foreground">
              ❄ {streak.freeze_tokens_available} freeze{" "}
              {streak.freeze_tokens_available === 1 ? "token" : "tokens"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  League widget                                                      */
/* ------------------------------------------------------------------ */

function LeagueWidget({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: LeagueStanding | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const league = data;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-display text-small font-semibold">
        <Trophy className="size-4 text-muted-foreground" /> League
      </p>
      {isLoading ? (
        <div className="mt-3">
          <SkeletonLines count={2} />
        </div>
      ) : isError ? (
        <p className="mt-3 text-xs text-muted-foreground">
          League standing unavailable.
          <button onClick={onRetry} className="ml-1 underline underline-offset-2">
            Retry
          </button>
        </p>
      ) : !league ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Not placed in a league this season.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2">
            <Badge
              className={cn(
                "capitalize",
                LEAGUE_TIER_STYLE[league.league_tier] ?? LEAGUE_TIER_STYLE.bronze,
              )}
            >
              {league.league_tier}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              #{league.rank_in_league} · {league.xp_this_season.toLocaleString()} XP
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-caption">
            {league.promotion_zone ? (
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 font-medium text-emerald-700">
                <TrendingUp className="size-3" /> Promotion zone
              </span>
            ) : null}
            {league.relegation_zone ? (
              <span className="rounded-md bg-rose-500/10 px-2 py-1 font-medium text-rose-700">
                Relegation zone
              </span>
            ) : null}
            {!league.promotion_zone && !league.relegation_zone ? (
              <span className="rounded-md bg-secondary px-2 py-1 font-medium text-muted-foreground">
                Mid-table
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guild widget                                                       */
/* ------------------------------------------------------------------ */

function GuildWidget({ guild }: { guild: { guild_id: string; member_count: number; combined_xp_this_week: number; guild_rank_global: number } | null }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-display text-small font-semibold">
        <Users className="size-4 text-muted-foreground" /> Guild
      </p>
      {!guild ? (
        <p className="mt-3 text-xs text-muted-foreground">Not in a guild this season.</p>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            {guild.member_count} members ·{" "}
            {guild.combined_xp_this_week.toLocaleString()} XP this week
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2 py-1 text-caption font-medium text-purple-700">
            <Trophy className="size-3" /> Global rank #{guild.guild_rank_global}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rank ladder section                                                */
/* ------------------------------------------------------------------ */

function RankLadderSection({
  ladder,
  currentLevel,
  currentPrestige,
  isLoading,
}: {
  ladder: { level: number; rank_name: string; min_xp: number; max_xp: number | null; tagline: string }[];
  currentLevel: number;
  currentPrestige: number;
  isLoading: boolean;
}) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-h2">
          The rank ladder
        </h2>
        <Badge variant="outline" className="text-caption">
          Initiate → Deus
        </Badge>
      </div>
      {isLoading ? (
        <div className="mt-4">
          <SkeletonLines count={5} />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-1.5">
          {ladder.map((r, i) => {
            const isCurrent = r.level === currentLevel;
            return (
              <motion.div
                key={r.level}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors",
                  isCurrent
                    ? "border-fuchsia-500/50 bg-fuchsia-500/10"
                    : "border-border bg-card hover:bg-card/70",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold",
                    isCurrent
                      ? "bg-fuchsia-500 text-white"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-small font-semibold">
                      {r.rank_name}
                    </p>
                    {isCurrent ? (
                      <Badge className="border-fuchsia-500/40 bg-fuchsia-500/15 text-caption text-fuchsia-600">
                        <Medal className="size-3" /> You are here
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {r.tagline}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {r.min_xp.toLocaleString()}
                  {r.max_xp !== null ? ` – ${r.max_xp.toLocaleString()}` : "+"}
                </span>
              </motion.div>
            );
          })}

          {/* Prestige tiers */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className={cn(
              "mt-1 flex items-center gap-4 rounded-xl border border-dashed border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-500/5 to-transparent px-4 py-3",
              currentPrestige > 0 && "border-fuchsia-500/60 bg-fuchsia-500/10",
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-fuchsia-500/20 font-mono text-sm font-bold text-fuchsia-600">
              ∞
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-small font-semibold">
                Prestige — Deus I / II / III…
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Rebirth loop: XP resets to 0 at Deus, keeping a permanent
                prestige counter + unique aura per tier.
              </p>
            </div>
            {currentPrestige > 0 ? (
              <Badge className="border-fuchsia-500/40 bg-fuchsia-500/15 text-caption text-fuchsia-600">
                <Sparkles className="size-3" /> Prestige {currentPrestige}
              </Badge>
            ) : (
                <span className="shrink-0 text-caption text-muted-foreground">
                Opt-in at Deus
              </span>
            )}
          </motion.div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */

function QuickLink({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-fuchsia-500/40 hover:bg-card/70"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-fuchsia-500/10 group-hover:text-fuchsia-600">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block font-display text-small font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}
