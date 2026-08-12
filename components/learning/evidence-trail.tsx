"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CodeXml,
  FlaskConical,
  LockKeyhole,
} from "lucide-react";

import type { MyLearningItem } from "@/lib/data/demo/content";
import { getDemoActivity, type DemoActivity } from "@/lib/demo/activity";
import { subscribeDemoStorage } from "@/lib/demo/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Stage = "learned" | "practiced" | "verified";

interface TrailItem {
  stage: Stage;
  label: string;
  detail: string;
  href: string;
  action: string;
  icon: typeof BookOpen;
  complete: boolean;
}

function latestActivity(activity: DemoActivity[], predicate: (entry: DemoActivity) => boolean) {
  return [...activity].reverse().find(predicate);
}

function buildTrail(items: MyLearningItem[], activity: DemoActivity[]): TrailItem[] {
  const activeCourse = items.find((item) => item.enrollment.progress_pct > 0);
  const lesson = latestActivity(activity, (entry) => entry.type === "lesson_completed");
  const practice = latestActivity(
    activity,
    (entry) => entry.type === "judge_submitted" || entry.type === "lab_started" || entry.type === "lab_completed",
  );
  const verifiedActivity = latestActivity(
    activity,
    (entry) =>
      entry.type === "lab_completed" ||
      (entry.type === "judge_submitted" && entry.metadata?.verdict === "accepted"),
  );
  const completedCourse = items.find((item) => item.enrollment.status === "completed");

  return [
    {
      stage: "learned",
      label: lesson?.label ?? (activeCourse ? `${activeCourse.course.title} in progress` : "Choose a lesson to begin"),
      detail: lesson ? "A concept is now part of your working context." : activeCourse ? `${Math.round(activeCourse.enrollment.progress_pct)}% of the course is complete.` : "Start with a practical course and make the first signal visible.",
      href: activeCourse ? `/courses/${activeCourse.course.id}/learn` : "/courses",
      action: activeCourse ? "Review course" : "Browse courses",
      icon: BookOpen,
      complete: Boolean(lesson || activeCourse),
    },
    {
      stage: "practiced",
      label: practice?.label ?? "The next practice signal is waiting",
      detail: practice ? "You have moved the idea into a hands-on surface." : "Use Judge or Labs to turn understanding into a repeatable action.",
      href: "/judge",
      action: practice ? "Practice again" : "Start practice",
      icon: practice?.type === "lab_started" || practice?.type === "lab_completed" ? FlaskConical : CodeXml,
      complete: Boolean(practice),
    },
    {
      stage: "verified",
      label: verifiedActivity?.label ?? (completedCourse ? `${completedCourse.course.title} completed` : "No verified milestone yet"),
      detail: verifiedActivity ? "This result can support your progress record." : completedCourse ? "Your course completion is part of the learner record." : "Complete a challenge, lab objective, or course to create evidence.",
      href: completedCourse ? "/rank" : "/labs",
      action: completedCourse || verifiedActivity ? "View evidence" : "Try a lab",
      icon: verifiedActivity || completedCourse ? CheckCircle2 : LockKeyhole,
      complete: Boolean(verifiedActivity || completedCourse),
    },
  ];
}

function stageLabel(stage: Stage): string {
  if (stage === "learned") return "Learned";
  if (stage === "practiced") return "Practiced";
  return "Verified";
}

export function EvidenceTrail({ items }: { items: MyLearningItem[] }) {
  const [activity, setActivity] = React.useState<DemoActivity[]>(() => getDemoActivity());
  React.useEffect(() => subscribeDemoStorage(() => setActivity(getDemoActivity())), []);
  const trail = buildTrail(items, activity);

  return (
    <section className="mt-10" aria-labelledby="evidence-trail-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Evidence trail</p>
          <h3 id="evidence-trail-title" className="mt-1 font-display text-xl font-semibold tracking-[-0.025em]">Learned. Practiced. Verified.</h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">Every useful effort should leave a trail you can return to.</p>
        </div>
        <Button variant="ghost" size="sm" className="text-primary" asChild>
          <Link href="/rank">View full record <ArrowRight /></Link>
        </Button>
      </div>

      <div className="relative mt-5 grid gap-3 md:grid-cols-3 md:gap-0">
        <div className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-px bg-border md:block" aria-hidden="true" />
        {trail.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.stage} className="relative rounded-2xl p-4 shadow-none md:rounded-none md:border-r-0 md:first:rounded-l-2xl md:last:rounded-r-2xl md:last:border-r">
              <div className="flex items-start gap-3">
                <span className={cn("relative z-10 grid size-9 shrink-0 place-items-center rounded-xl border bg-card", item.complete ? "border-primary/25 text-primary" : "border-border text-muted-foreground")}>
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{stageLabel(item.stage)}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{item.label}</p>
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                  <Link href={item.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring">
                    {item.action} <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
