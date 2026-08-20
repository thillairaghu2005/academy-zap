"use client";

import * as React from "react";
import { Activity, BarChart3, Clock3, FlaskConical, LoaderCircle, Play, Trophy, TrendingUp } from "lucide-react";

import { getAnalyticsSummary } from "@/lib/demo/analytics";
import { AreaChart } from "@/components/viz/area-chart";
import { ActivityHeatmap } from "@/components/dashboard/progress-pulse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { cn } from "@/lib/utils";

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

  const stats = summary
    ? [
        { label: "Learning hours", value: `${Math.max(1, Math.round(summary.completedLessons * 0.8 + 12))}h`, icon: Clock3 },
        { label: "Lessons completed", value: summary.completedLessons, icon: Activity },
        { label: "Judge submissions", value: summary.judgeSubmissions, icon: BarChart3 },
        { label: "Active pages", value: summary.pages, icon: TrendingUp },
      ]
    : [];

  const funnel = summary
    ? [
        { label: "Page views", count: Math.max(summary.pages * 14, summary.total || 14), icon: Play },
        { label: "Lab sessions", count: summary.labStarts, icon: FlaskConical },
        { label: "Assessments", count: summary.assessmentSubmissions, icon: Activity },
        { label: "Lessons completed", count: summary.completedLessons, icon: Trophy },
        { label: "Judge submissions", count: summary.judgeSubmissions, icon: BarChart3 },
      ]
    : [];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.count));

  if (!summary) {
    return (
      <PageContainer className="pt-8 sm:pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Admin / demo analytics</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Learning signal</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">A frontend-only view of the activity events already captured by the demo experience.</p>
        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> Loading analytics...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="pt-8 sm:pt-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Admin / demo analytics</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Learning signal</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">A frontend-only view of the activity events already captured by the demo experience.</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <Icon className="size-4 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Demo</span>
                </div>
                <p className="mt-5 font-display text-3xl font-semibold tabular-nums">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Engagement trend</CardTitle>
            <p className="text-xs text-muted-foreground">Relative learning activity over the last twelve weeks.</p>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={WEEKS}
              labels={["12 weeks ago", "now"]}
              height={192}
              ariaLabel="Engagement trend over the last twelve weeks"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progression funnel</CardTitle>
            <p className="text-xs text-muted-foreground">How learners move through the loop, top to bottom.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {funnel.map((stage, index) => {
              const pct = Math.round((stage.count / funnelMax) * 100);
              return (
                <div key={stage.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <stage.icon className="size-3.5 text-muted-foreground" />
                      {stage.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {stage.count.toLocaleString()}
                      {index > 0 ? (
                        <span className="ml-2 text-[10px] text-muted-foreground/70">
                          {Math.round((stage.count / Math.max(1, funnel[index - 1]?.count ?? 1)) * 100)}%
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", index === funnel.length - 1 ? "bg-success" : "bg-primary")}
                      style={{ width: `${pct}%`, opacity: 1 - index * 0.14 }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <ActivityHeatmap compact />
      </div>
    </PageContainer>
  );
}