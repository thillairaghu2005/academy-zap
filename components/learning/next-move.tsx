"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  CodeXml,
  Compass,
  FlaskConical,
  Sparkles,
} from "lucide-react";

import { getCourse, listMyLearning } from "@/lib/data/demo/content";
import { getProblem } from "@/lib/data/demo/judge";
import { getProfile } from "@/lib/data/demo/profile";
import type { MyLearningItem } from "@/lib/data/demo/content";
import { getDemoActivity, type DemoActivity } from "@/lib/demo/activity";
import { subscribeDemoStorage } from "@/lib/demo/storage";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MoveIcon = typeof BookOpen;

interface Move {
  eyebrow: string;
  context: string;
  title: string;
  detail: string;
  expectation: string;
  href: string;
  secondaryHref: string;
  secondaryLabel: string;
  actionLabel: string;
  icon: MoveIcon;
  iconClassName: string;
}

function formatMinutes(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

function latestFailedJudge(activity: DemoActivity[]): DemoActivity | undefined {
  return [...activity]
    .reverse()
    .find(
      (entry) =>
        entry.type === "judge_submitted" &&
        entry.metadata?.verdict !== "accepted",
    );
}

function latestAssessment(activity: DemoActivity[]): DemoActivity | undefined {
  return [...activity]
    .reverse()
    .find((entry) => entry.type === "assessment_submitted");
}

function latestLab(activity: DemoActivity[]): DemoActivity | undefined {
  return [...activity]
    .reverse()
    .find((entry) => entry.type === "lab_started");
}

function activeLearningItem(items: MyLearningItem[]): MyLearningItem | undefined {
  return items.find(
    (item) =>
      item.enrollment.status !== "completed" &&
      item.enrollment.progress_pct > 0,
  );
}

function freshLearningItem(items: MyLearningItem[]): MyLearningItem | undefined {
  return items.find((item) => item.enrollment.status !== "completed");
}

function moveForCourse(
  item: MyLearningItem,
  course: Awaited<ReturnType<typeof getCourse>> | undefined,
): Move {
  const lesson = course?.syllabus
    .flatMap((section) => section.lessons)
    .find((candidate) => candidate.id === item.enrollment.last_lesson_id);
  const fallbackLesson = course?.syllabus[0]?.lessons[0];
  const activeLesson = lesson ?? fallbackLesson;
  const remainingSeconds = activeLesson
    ? Math.max(
        0,
        activeLesson.duration_seconds - item.enrollment.last_position_seconds,
      )
    : 0;
  const isResume = item.enrollment.progress_pct > 0;

  return {
    eyebrow: isResume ? "Resuming your course" : "Start your learning path",
    context: `${item.course.category} / ${item.course.title}`,
    title: activeLesson
      ? `${isResume ? "Continue" : "Start"} lesson ${activeLesson.position}: ${activeLesson.title}`
      : `${isResume ? "Continue" : "Start"} ${item.course.title}`,
    detail: activeLesson
      ? `${formatMinutes(remainingSeconds || activeLesson.duration_seconds)} remaining`
      : `${item.course.estimated_hours} hours of practical work`,
    expectation: isResume
      ? `Finish this lesson and move beyond ${Math.round(item.enrollment.progress_pct)}% of the course.`
      : "Begin with the first lesson and turn your goal into visible progress.",
    href: `/courses/${item.course.id}/learn`,
    secondaryHref: "/courses?sort=recommended",
    secondaryLabel: "Change focus",
    actionLabel: isResume ? "Continue lesson" : "Start lesson",
    icon: BookOpen,
    iconClassName: "bg-primary/10 text-primary",
  };
}

function fallbackMove(
  activity: DemoActivity[],
  profileGoal: string | undefined,
  problemTitle: string | undefined,
  problemId: string | undefined,
): Move {
  const failedJudge = latestFailedJudge(activity);
  if (failedJudge && problemId) {
    return {
      eyebrow: "Practice the idea you just touched",
      context: `Judge / ${problemTitle ?? "Coding challenge"}`,
      title: "Turn the failed attempt into a smaller win",
      detail: "Review the failure, adjust one assumption, and run the tests again.",
      expectation: "A focused retry creates a clearer signal than starting a new topic.",
      href: `/judge/${problemId}`,
      secondaryHref: "/courses?sort=recommended",
      secondaryLabel: "Review a lesson",
      actionLabel: "Retry challenge",
      icon: CodeXml,
      iconClassName: "bg-primary/10 text-primary",
    };
  }

  const lab = latestLab(activity);
  const labId = typeof lab?.metadata?.lab_id === "string" ? lab.metadata.lab_id : undefined;
  if (lab && labId) {
    return {
      eyebrow: "Finish the hands-on work",
      context: `Lab / ${lab.label.replace(/ started$/, "")}`,
      title: "Return to the hands-on lab",
      detail: "Your sandbox work is the closest path to a verified objective.",
      expectation: "Pick up at the objective you were working toward before starting something new.",
      href: `/labs/${labId}`,
      secondaryHref: "/judge",
      secondaryLabel: "Practice in Judge",
      actionLabel: "Return to lab",
      icon: FlaskConical,
      iconClassName: "bg-primary/10 text-primary",
    };
  }

  const assessment = latestAssessment(activity);
  if (assessment) {
    return {
      eyebrow: "Review your last assessment",
      context: "Assessments / Keep the signal useful",
      title: "Review the questions that need another pass",
      detail: assessment.label,
      expectation: "A short review now makes the next attempt more deliberate.",
      href: "/assessments",
      secondaryHref: "/courses?sort=recommended",
      secondaryLabel: "Review a lesson",
      actionLabel: "Review answers",
      icon: CheckCircle2,
      iconClassName: "bg-primary/10 text-primary",
    };
  }

  return {
    eyebrow: profileGoal ? "Aligned to your learning goal" : "Choose a practical first step",
    context: profileGoal ? profileGoal : "Zapsters / Build a useful habit",
    title: profileGoal
      ? `Start a focused path toward ${profileGoal.toLowerCase()}`
      : "Start with one practical lesson",
    detail: "Pick a small piece of work that ends with something you can verify.",
    expectation: "One focused session is enough to make the next move easier to see.",
    href: "/courses?sort=recommended",
    secondaryHref: "/labs",
    secondaryLabel: "Explore labs",
    actionLabel: "Browse courses",
    icon: Compass,
    iconClassName: "bg-primary/10 text-primary",
  };
}

function NextMoveSkeleton() {
  return (
    <Card className="mt-7 overflow-hidden rounded-3xl border-primary-border bg-primary-muted p-5 sm:p-7">
      <div className="flex gap-4">
        <div className="size-11 shrink-0 rounded-2xl bg-primary/10" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-3 w-36 rounded bg-primary/10" />
          <div className="h-6 w-3/4 rounded bg-primary/10" />
          <div className="h-3 w-1/2 rounded bg-primary/10" />
        </div>
      </div>
    </Card>
  );
}

export function NextMove() {
  const { user } = useSession();
  const userId = user?.id ?? "";
  const [activity, setActivity] = React.useState<DemoActivity[]>(() => getDemoActivity());

  React.useEffect(() => subscribeDemoStorage(() => setActivity(getDemoActivity())), []);

  const learningQuery = useQuery({
    queryKey: ["my-learning", userId],
    queryFn: () => listMyLearning(userId),
    enabled: Boolean(userId),
  });
  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId),
    enabled: Boolean(userId),
  });

  const items = learningQuery.data ?? [];
  const item = activeLearningItem(items) ?? freshLearningItem(items);
  const courseQuery = useQuery({
    queryKey: ["next-move-course", item?.course.id],
    queryFn: () => getCourse(item!.course.id),
    enabled: Boolean(item),
  });
  const failedJudge = latestFailedJudge(activity);
  const problemId =
    typeof failedJudge?.metadata?.problem_id === "string"
      ? failedJudge.metadata.problem_id
      : undefined;
  const problemQuery = useQuery({
    queryKey: ["next-move-problem", problemId],
    queryFn: () => getProblem(problemId!),
    enabled: !item && Boolean(problemId),
  });

  if (learningQuery.isLoading || profileQuery.isLoading) return <NextMoveSkeleton />;

  const move = item
    ? moveForCourse(item, courseQuery.data)
    : fallbackMove(
        activity,
        profileQuery.data?.learning_goals[0],
        problemQuery.data?.title,
        problemId,
      );
  const Icon = move.icon;

  return (
    <section
      id="next-move"
      aria-labelledby="next-move-title"
      className="relative mt-7 overflow-hidden rounded-3xl border border-primary-border bg-primary-muted shadow-[0_10px_30px_rgb(180_35_60_/_7%)]"
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 bg-grid opacity-35 [mask-image:linear-gradient(to_left,black,transparent)] lg:block" />
      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)] lg:items-center lg:p-8">
        <div className="flex min-w-0 gap-4 sm:gap-5">
          <div className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", move.iconClassName)}>
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-primary/15 bg-primary/10 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                Next move
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">{move.eyebrow}</span>
            </div>
            <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              {move.context}
            </p>
            <h2 id="next-move-title" className="mt-2 max-w-2xl font-display text-2xl font-semibold leading-tight tracking-[-0.035em] sm:text-3xl">
              {move.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Clock3 className="size-4 text-primary" aria-hidden="true" />
                {move.detail}
              </span>
              <span className="text-xs">{move.expectation}</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button asChild >
                <Link href={move.href}>
                  {move.actionLabel}
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={move.secondaryHref}>{move.secondaryLabel}</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/10 bg-white/70 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            {move.icon === CodeXml ? <CodeXml className="size-4 text-primary" /> : move.icon === FlaskConical ? <FlaskConical className="size-4 text-primary" /> : <Sparkles className="size-4 text-primary" />}
            Why this is next
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Zapsters keeps one action in view so learning can move from a concept
            to a verified result without another planning screen.
          </p>
          <div className="mt-4 flex items-center gap-2 border-t border-primary/10 pt-3 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            {courseQuery.isLoading || problemQuery.isLoading ? "Preparing your context..." : "Context is ready"}
          </div>
        </div>
      </div>
    </section>
  );
}
