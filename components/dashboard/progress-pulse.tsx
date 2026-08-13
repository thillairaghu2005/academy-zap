"use client";

import * as React from "react";
import { formatRelativeLocalDate } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Flame, Target } from "lucide-react";

import { getProgressContext } from "@/lib/data/demo/gamification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const ACTIVITY_CELL_KEYS = Array.from({ length: 84 }, (_, index) => `activity-${index}`);

function ActivityHeatmap({ baseDate }: { baseDate: string }) {
  const cells = Array.from({ length: 84 }, (_, index) => {
    const level = (index * 7 + 3) % 5;
    return level === 0 ? 0 : level;
  });
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="w-4" />{WEEKDAYS.map((day, index) => <span key={`${day}-${index}`} className="w-3 text-center text-[10px]">{day}</span>)}</div>
      <div className="grid grid-flow-col grid-rows-7 gap-1.5" role="img" aria-label="Learning activity over the last twelve weeks">
         {cells.map((level, index) => <span key={ACTIVITY_CELL_KEYS[index]} title={`${formatRelativeLocalDate(baseDate, cells.length - index)}: ${level * 12} XP`} className={cn("size-3 rounded-[3px] border border-transparent", level === 0 ? "bg-muted" : level === 1 ? "bg-primary/20" : level === 2 ? "bg-primary/40" : level === 3 ? "bg-primary/65" : "bg-primary")} />)}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>12 weeks ago</span><span>Today</span></div>
    </div>
  );
}

function DailyGoal({ xp }: { xp: number }) {
  const goal = 30;
  const progress = Math.min(100, Math.round((xp / goal) * 100));
  return (
    <div className="flex items-center gap-4">
      <div className="relative grid size-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-primary) ${progress}%, var(--color-primary-light) 0)` }} aria-label={`${xp} of ${goal} XP daily goal`}>
        <div className="grid size-[4.5rem] place-items-center rounded-full bg-card"><span className="font-display text-xl font-semibold tabular-nums">{xp}</span><span className="-mt-1 text-[10px] text-muted-foreground">/ {goal} XP</span></div>
      </div>
      <div><p className="text-sm font-semibold">Today&apos;s goal</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{progress >= 100 ? "Goal complete. Keep your rhythm going." : `${goal - xp} XP to keep today's promise.`}</p><div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary"><Flame className="size-3.5" />+{Math.max(1, Math.round(progress / 10))} momentum</div></div>
    </div>
  );
}

export function ProgressPulse({ userId }: { userId: string }) {
  const query = useQuery({ queryKey: ["progress-context", userId], queryFn: () => getProgressContext(userId), enabled: Boolean(userId) });
  if (query.isLoading) return <div className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><Card className="h-56 animate-pulse bg-surface-1" /><Card className="h-56 animate-pulse bg-surface-1" /></div>;
  if (query.isError || !query.data) return <Card className="mt-7 border-danger/20 bg-danger/5 p-5 text-sm text-danger-strong" role="alert">Your progress snapshot is temporarily unavailable. Continue learning and refresh to try again.</Card>;

  const { streak, rank } = query.data;
  const todayXp = Math.min(30, Math.round((rank.rank_progress_pct % 31) + 8));
  const plan = streak.current_streak_days >= 7 ? ["One React Hooks lesson", "One Judge problem", "10-minute review"] : ["Finish the next lesson", "Try one Judge problem", "Write one note"];

  return (
    <section className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]" aria-label="Learning momentum">
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Learning streak</p><CardTitle className="mt-2 text-xl">Your practice is adding up.</CardTitle></div><div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><Flame className="size-3.5" />{streak.current_streak_days} day streak</div></CardHeader>
         <CardContent><ActivityHeatmap baseDate={query.data.computed_at} /><div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3"><div><p className="font-display text-xl font-semibold">{streak.longest_streak_days}</p><p className="text-[11px] text-muted-foreground">Longest streak</p></div><div><p className="font-display text-xl font-semibold">{streak.freeze_tokens_available}</p><p className="text-[11px] text-muted-foreground">Streak freezes</p></div><div className="hidden sm:block"><p className="font-display text-xl font-semibold">{streak.momentum_multiplier.toFixed(1)}x</p><p className="text-[11px] text-muted-foreground">Momentum multiplier</p></div></div></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Today</p><CardTitle className="mt-2 text-xl">A small plan beats a perfect one.</CardTitle></CardHeader>
        <CardContent><DailyGoal xp={todayXp} /><div className="mt-6 border-t border-border pt-5"><div className="mb-3 flex items-center justify-between"><p className="flex items-center gap-2 text-xs font-semibold"><Target className="size-4 text-primary" /> Suggested plan</p><span className="text-[11px] text-muted-foreground">{rank.rank_name}</span></div><ul className="grid gap-3">{plan.map((item, index) => <li key={item} className="flex items-center gap-2.5 text-sm"><span className="grid size-5 place-items-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground">{index + 1}</span><span className="flex-1">{item}</span><CheckCircle2 className="size-4 text-border-strong" /></li>)}</ul></div><div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><CalendarDays className="size-3.5 text-primary" /> Next check-in: today at 7:00 PM</div></CardContent>
      </Card>
    </section>
  );
}
