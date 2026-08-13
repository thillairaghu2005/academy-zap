"use client";

import * as React from "react";
import { formatShortMonthDay } from "@/lib/format";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CalendarDays, Flame, Target } from "lucide-react";

import type { MyLearningItem } from "@/lib/data/demo/content";
import { searchCatalog } from "@/lib/data/demo/content";
import { getProfile } from "@/lib/data/demo/profile";
import { getDemoActivity, type DemoActivity } from "@/lib/demo/activity";
import { subscribeDemoStorage } from "@/lib/demo/storage";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

function weeklyMinutes(activity: DemoActivity[]): number {
  const start = startOfWeek(new Date()).getTime();
  return activity
    .filter((entry) => new Date(entry.created_at).getTime() >= start)
    .reduce((total, entry) => {
      const fallback = entry.type === "lab_started" || entry.type === "lab_completed" ? 45 : entry.type === "assessment_submitted" ? 30 : entry.type === "judge_submitted" ? 20 : 0;
      return total + Number(entry.metadata?.minutes ?? fallback);
    }, 0);
}

function weekDays(activity: DemoActivity[]): number[] {
  const start = startOfWeek(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    return activity.filter((entry) => {
      const time = new Date(entry.created_at).getTime();
      return time >= day.getTime() && time < next.getTime();
    }).length;
  });
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function WeeklyGoal({ activity }: { activity: DemoActivity[] }) {
  const { user } = useSession();
  const profileQuery = useQuery({
    queryKey: ["profile", user?.id ?? "anonymous"],
    queryFn: () => getProfile(user?.id ?? ""),
    enabled: Boolean(user),
  });
  const goalHours = profileQuery.data?.weekly_goal_hours ?? 6;
  const minutes = weeklyMinutes(activity);
  const progress = Math.min(100, Math.round((minutes / (goalHours * 60)) * 100));
  const days = weekDays(activity);

  return (
    <Card className="h-full rounded-2xl">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Weekly goal</p>
          <CardTitle className="mt-1 text-lg">Build the habit</CardTitle>
        </div>
        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Target className="size-4" /></div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <p className="font-display text-3xl font-semibold tabular-nums">{(minutes / 60).toFixed(1)}<span className="ml-1 text-sm font-medium text-muted-foreground">/ {goalHours}h</span></p>
          <Badge variant="secondary">{progress}%</Badge>
        </div>
        <Progress value={progress} className="mt-4 h-2" />
        <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Activity this week">
          {days.map((count, index) => (
             <div key={`${WEEKDAY_LABELS[index]}-${index}`} className="text-center">
              <span className={`mx-auto grid size-7 place-items-center rounded-lg text-[10px] font-semibold ${count ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`} title={`${count} activities`}>
                {count || "·"}
              </span>
               <span className="mt-1 block text-[10px] text-muted-foreground">{WEEKDAY_LABELS[index]}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {minutes ? "Momentum is visible. One more focused session keeps the streak alive." : "Complete a lesson, lab, or challenge to start this week's progress."}
        </p>
      </CardContent>
    </Card>
  );
}

function RecentActivity({ activity }: { activity: DemoActivity[] }) {
  const entries = activity.slice(-4).reverse();
  return (
    <Card className="h-full rounded-2xl">
      <CardHeader className="flex-row items-center gap-2 space-y-0"><CalendarDays className="size-4 text-primary" /><CardTitle className="text-lg">Recent activity</CardTitle></CardHeader>
      <CardContent>
        {entries.length ? (
          <div className="divide-y divide-border">
            {entries.map((entry) => <div key={`${entry.created_at}-${entry.label}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Flame className="size-3.5" /></span><span className="min-w-0 flex-1 truncate text-xs font-medium">{entry.label}</span><span className="shrink-0 text-[10px] text-muted-foreground">{formatShortMonthDay(entry.created_at)}</span></div>)}
          </div>
        ) : <p className="text-sm leading-relaxed text-muted-foreground">Your completed lessons, labs, assessments, and Judge attempts will appear here.</p>}
        <Button variant="ghost" size="sm" className="mt-4 px-0 text-primary" asChild><Link href="/rank">View your progress <ArrowRight /></Link></Button>
      </CardContent>
    </Card>
  );
}

function Recommendations({ items }: { items: MyLearningItem[] }) {
  const catalogQuery = useQuery({ queryKey: ["dashboard-recommendations"], queryFn: () => searchCatalog({ page: 1, pageSize: 8, sort: "recommended" }) });
  const enrolled = new Set(items.map((item) => item.course.id));
  const recommendations = catalogQuery.data?.hits.filter((course) => !enrolled.has(course.id)).slice(0, 3) ?? [];
  if (!recommendations.length) return null;
  return (
    <section>
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Keep exploring</p><h3 className="mt-1 font-display text-xl font-semibold">Recommended next steps</h3></div><Button variant="ghost" size="sm" asChild><Link href="/courses">View catalog <ArrowRight /></Link></Button></div>
       <div className="mt-4 grid gap-3 md:grid-cols-3">{recommendations.map((course) => <Link key={course.id} href={`/courses/${course.id}`} className="group rounded-2xl border border-border bg-card p-4 outline-none transition-[transform,border-color] hover:-translate-y-0.5 hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-center justify-between gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen className="size-4" /></span><Badge variant="outline">{course.level}</Badge></div><h4 className="mt-4 line-clamp-2 font-display font-semibold group-hover:text-primary">{course.title}</h4><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{course.subtitle}</p><p className="mt-4 text-xs font-medium text-primary">{course.estimated_hours}h · {course.category}</p></Link>)}</div>
    </section>
  );
}

export function LearningInsights({ items }: { items: MyLearningItem[] }) {
  const [activity, setActivity] = React.useState<DemoActivity[]>(() => getDemoActivity());
  React.useEffect(() => subscribeDemoStorage(() => setActivity(getDemoActivity())), []);
  return <div className="mt-10 space-y-10"><div className="grid gap-4 md:grid-cols-2"><WeeklyGoal activity={activity} /><RecentActivity activity={activity} /></div><Recommendations items={items} /></div>;
}
