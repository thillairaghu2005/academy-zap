"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Flame,
  LoaderCircle,
  ShieldCheck,
  Trophy,
} from "lucide-react";

import { getCourse, listMyLearning } from "@/lib/api/content";
import { getProgressContext } from "@/lib/api/gamification";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

function PersonalizedHeroSkeleton() {
  return (
    <section className="border-b border-border bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16 lg:px-8 lg:py-20">
        <div>
          <Skeleton className="h-3 w-32 bg-background/15" />
          <Skeleton className="mt-5 h-14 w-full max-w-lg bg-background/15" />
          <Skeleton className="mt-3 h-14 w-4/5 max-w-md bg-background/15" />
          <Skeleton className="mt-6 h-5 w-full max-w-lg bg-background/15" />
          <Skeleton className="mt-2 h-5 w-3/4 max-w-md bg-background/15" />
        </div>
        <Card className="border-background/15 bg-background/[0.06] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <Skeleton className="h-4 w-32 bg-background/15" />
          <Skeleton className="mt-4 h-8 w-3/4 bg-background/15" />
          <Skeleton className="mt-2 h-4 w-1/2 bg-background/15" />
          <Skeleton className="mt-8 h-2 w-full bg-background/15" />
        </Card>
      </div>
    </section>
  );
}

function formatLessonPosition(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function PersonalizedHero() {
  const { user, isLoading: sessionLoading } = useSession();
  const userId = user?.id ?? "";

  const learningQuery = useQuery({
    queryKey: ["my-learning", userId],
    queryFn: () => listMyLearning(userId),
    enabled: Boolean(userId),
  });

  const contextQuery = useQuery({
    queryKey: ["progress-context", userId],
    queryFn: () => getProgressContext(userId),
    enabled: Boolean(userId),
  });

  const resumeItem = learningQuery.data?.find(
    (item) => item.enrollment.last_lesson_id !== null,
  );
  const resumeCourseId = resumeItem?.course.id;
  const courseQuery = useQuery({
    queryKey: ["course", resumeCourseId],
    queryFn: () => getCourse(resumeCourseId ?? ""),
    enabled: Boolean(resumeCourseId),
  });
  const resumeLesson = courseQuery.data?.syllabus
    .flatMap((section) => section.lessons)
    .find((lesson) => lesson.id === resumeItem?.enrollment.last_lesson_id);

  if (sessionLoading) return <PersonalizedHeroSkeleton />;
  if (!user) return null;

  const context = contextQuery.data;
  const resumeHref = resumeItem
    ? `/courses/${resumeItem.course.id}/learn`
    : "/courses";

  return (
    <section className="border-b border-border bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16 lg:px-8 lg:py-20">
        <div className="max-w-2xl motion-safe:animate-fade-up">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-primary-light">
            Welcome back, {user.display_name.split(" ")[0]}
          </p>
          <h1 className="mt-5 max-w-xl font-display text-hero text-background">
            Continue where
            <br />
            <span className="text-primary-light">you left off.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-background/70 sm:text-lg">
            Keep the loop moving: finish the lesson, prove the skill, and turn
            the next verified effort into momentum.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="gradient" size="lg" asChild>
              <Link href={resumeHref}>
                {resumeItem ? "Resume lesson" : "Browse courses"} <ArrowRight />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-background/20 bg-transparent text-background hover:bg-background/10 hover:text-background"
              asChild
            >
              <Link href="/judge">Open the Judge</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-background/15 bg-background/[0.06] p-5 text-background shadow-2xl shadow-black/20 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 text-primary-light">
                <BookOpen className="size-4" />
                <span className="font-mono text-xs uppercase tracking-widest">
                  Last accessed
                </span>
              </div>
              {resumeItem ? (
                <span className="font-mono text-xs text-background/45">
                  {resumeItem.enrollment.progress_pct}% complete
                </span>
              ) : null}
            </div>
            {learningQuery.isLoading || courseQuery.isLoading ? (
              <div className="mt-6 space-y-3">
                <Skeleton className="h-8 w-4/5 bg-background/15" />
                <Skeleton className="h-4 w-3/5 bg-background/15" />
                <Skeleton className="mt-5 h-2 w-full bg-background/15" />
              </div>
            ) : resumeItem && resumeLesson ? (
              <>
                <h2 className="mt-6 font-display text-h2">{resumeLesson.title}</h2>
                <p className="mt-1 text-sm text-background/60">
                  {resumeItem.course.title}
                  {resumeItem.enrollment.last_position_seconds > 0
                    ? ` · resume at ${formatLessonPosition(resumeItem.enrollment.last_position_seconds)}`
                    : ""}
                </p>
                <Progress
                  value={resumeItem.enrollment.progress_pct}
                  className="mt-6 bg-background/15"
                  indicatorClassName="bg-primary-light"
                  aria-label={`${resumeItem.course.title} progress`}
                />
              </>
            ) : (
              <div className="mt-6">
                <h2 className="font-display text-h2">Your next lesson is waiting.</h2>
                <p className="mt-2 text-sm leading-relaxed text-background/60">
                  Enroll in a course and your resume position will appear here.
                </p>
              </div>
            )}
          </Card>

          <div className="grid gap-3 sm:grid-rows-2">
            <Card className="border-background/15 bg-background/[0.06] p-5 text-background">
              <div className="flex items-center gap-2 text-xp-mastery">
                <Flame className="size-4" />
                <span className="font-mono text-xs uppercase tracking-widest">
                  Current streak
                </span>
              </div>
              <p className="mt-3 font-display text-3xl">
                {contextQuery.isLoading ? (
                  <LoaderCircle className="size-6 animate-spin" />
                ) : (
                  context?.streak.current_streak_days ?? "—"
                )}
                <span className="ml-1 text-sm font-normal text-background/55">days</span>
              </p>
              <p className="mt-1 text-xs text-background/50">
                Keep showing up to protect your momentum.
              </p>
            </Card>

            <Card className="border-background/15 bg-background/[0.06] p-5 text-background">
              <div className="flex items-center gap-2 text-xp-completion">
                <Trophy className="size-4" />
                <span className="font-mono text-xs uppercase tracking-widest">
                  Rank snapshot
                </span>
              </div>
              {contextQuery.isLoading ? (
                <LoaderCircle className="mt-4 size-6 animate-spin" />
              ) : context ? (
                <>
                  <p className="mt-3 font-display text-2xl">{context.rank.rank_name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 font-mono text-xs">
                    <span className="border-l-2 border-xp-completion pl-2 text-xp-completion">
                      {context.rank.completion_xp.toLocaleString()} completion XP
                    </span>
                    <span className="border-l-2 border-xp-mastery pl-2 text-xp-mastery">
                      {context.rank.mastery_xp.toLocaleString()} mastery XP
                    </span>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-background/60">
                  Rank data will appear after your first verified effort.
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-5 font-mono text-[11px] text-background/45 sm:px-6 lg:px-8">
        <ShieldCheck className="size-3.5 text-success" />
        Progress is read from the server-owned learning and gamification projections.
      </div>
    </section>
  );
}
