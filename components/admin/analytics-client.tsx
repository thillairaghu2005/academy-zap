"use client";

import * as React from "react";
import { Activity, BarChart3, Clock3, Flame, LoaderCircle, TrendingUp } from "lucide-react";

import { getAnalyticsSummary } from "@/lib/demo/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";

const WEEKS_COUNT = 12;

function trendSeries(seed: number): number[] {
  const series: number[] = [];
  let value = 25 + (seed % 32);
  for (let i = 0; i < WEEKS_COUNT; i++) {
    value = Math.max(14, Math.min(100, Math.round(value + (((seed >> (i * 3)) % 9) - 4))));
    series.push(value);
  }
  return series;
}

export function AnalyticsClient() {
  const [summary, setSummary] = React.useState<ReturnType<typeof getAnalyticsSummary> | null>(null);
  React.useEffect(() => {
    React.startTransition(() => setSummary(getAnalyticsSummary()));
  }, []);
  const WEEKS = summary ? trendSeries(summary.completedLessons * 31 + summary.total) : [];
  const stats = summary ? [{ label: "Learning hours", value: `${Math.max(1, Math.round(summary.completedLessons * 0.8 + 12))}h`, icon: Clock3 }, { label: "Lessons completed", value: summary.completedLessons, icon: Activity }, { label: "Judge submissions", value: summary.judgeSubmissions, icon: BarChart3 }, { label: "Active pages", value: summary.pages, icon: TrendingUp }] : [];

  return <PageContainer className="pt-8 sm:pt-10"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Admin / demo analytics</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Learning signal</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">A frontend-only view of the activity events already captured by the demo experience.</p></div>{!summary ? <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading analytics...</div> : <><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => { const Icon = stat.icon; return <Card key={stat.label}><CardContent className="p-5"><div className="flex items-center justify-between"><Icon className="size-4 text-primary" /><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Demo</span></div><p className="mt-5 font-display text-3xl font-semibold tabular-nums">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.label}</p></CardContent></Card>; })}</div><div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]"><Card><CardHeader><CardTitle className="text-lg">Engagement trend</CardTitle><p className="text-xs text-muted-foreground">Relative learning activity over the last twelve weeks.</p></CardHeader><CardContent><div className="flex h-48 items-end gap-2 border-b border-l border-border px-3 pb-0 pt-6">{WEEKS.map((value, index) => <div key={index} className="group relative flex h-full flex-1 items-end"><span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-background opacity-0 transition-opacity duration-150 group-hover:opacity-100">{value}</span><span className="w-full rounded-t-md bg-primary/15 transition-colors group-hover:bg-primary/35" style={{ height: `${value}%` }}><span className="block h-full rounded-t-md bg-primary" style={{ opacity: index > 7 ? 0.9 : 0.5 }} /></span><span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">W{index + 1}</span></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle className="text-lg">Consistency</CardTitle><p className="text-xs text-muted-foreground">The strongest product signal is a return habit.</p></CardHeader><CardContent><div className="flex items-center gap-4"><div className="grid size-20 place-items-center rounded-full border-[9px] border-primary/15 border-t-primary border-r-primary"><Flame className="size-6 text-primary" /></div><div><p className="font-display text-3xl font-semibold">7.4</p><p className="text-xs text-muted-foreground">average active days / week</p></div></div><div className="mt-7 space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Lesson completion</span><span className="font-semibold">82%</span></div><div className="h-2 rounded-full bg-primary/10"><div className="h-full w-[82%] rounded-full bg-primary" /></div><div className="flex justify-between"><span className="text-muted-foreground">Practice follow-through</span><span className="font-semibold">68%</span></div><div className="h-2 rounded-full bg-primary/10"><div className="h-full w-[68%] rounded-full bg-primary/65" /></div></div></CardContent></Card></div></>}</PageContainer>;
}
