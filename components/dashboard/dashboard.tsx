"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { m as motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Flame,
  Gift,
  Layers,
  LoaderCircle,
  Trophy,
} from "lucide-react";

import type { SurfaceMeta } from "@/lib/surfaces";
import { surfaces } from "@/lib/surfaces";
import { getProgressContext } from "@/lib/data/demo/gamification";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { MyLearning } from "@/components/dashboard/my-learning";
import { useSession } from "@/components/providers/session-provider";
import { OnboardingDialog } from "@/components/dashboard/onboarding-dialog";
import { Progress } from "@/components/ui/progress";
import { ProgressPulse } from "@/components/dashboard/progress-pulse";
import { NextMove } from "@/components/learning/next-move";

function SurfaceCard({ surface }: { surface: SurfaceMeta }) {
  const Icon = surface.icon;
  const statusLabel = surface.status === "shipped" ? "Live now" : surface.status === "next" ? "Coming next" : "Preview";

  return (
    <Link href={surface.href} className="group block h-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <Card className="relative h-full overflow-hidden transition-[transform,border-color,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/10">
        <div className={cn("absolute inset-x-0 top-0 h-0.5", surface.status === "shipped" ? "bg-primary" : "bg-border-strong")} />
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <div
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm transition-transform duration-300 group-hover:scale-105",
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base">{surface.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{surface.navLabel}</p>
              </div>
              <span className="shrink-0 rounded-full border border-border bg-surface-1 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {surface.stage}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {surface.tagline}
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
            <span className={cn("text-[11px] font-semibold", surface.status === "shipped" ? "text-success-strong" : "text-muted-foreground")}>
              {statusLabel}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
              Open
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MomentumPanel({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["progress-context", userId],
    queryFn: () => getProgressContext(userId),
    enabled: Boolean(userId),
  });

  return (
    <div className="rounded-2xl border border-border bg-white/75 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Momentum</p>
        <Trophy className="size-4 text-primary" />
      </div>
      {isLoading ? (
        <LoaderCircle className="mt-5 size-5 animate-spin text-primary" aria-label="Loading momentum" />
      ) : data ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="font-display text-xl font-semibold tracking-[-0.03em]">{data.rank.rank_name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Level {data.rank.level} rank</p>
            </div>
            <div className="border-l border-border pl-3">
              <div className="flex items-center gap-1.5">
                <Flame className="size-3.5 text-warning-strong" />
                <p className="font-display text-xl font-semibold tabular-nums">{data.streak.current_streak_days}</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Day streak</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Next rank</span>
              <span className="font-medium tabular-nums text-foreground">{data.rank.rank_progress_pct}%</span>
            </div>
            <Progress value={data.rank.rank_progress_pct} className="h-1.5 bg-primary/10" indicatorClassName="bg-primary" />
          </div>
          <Link href="/rank" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring">
            View rank details <ArrowRight className="size-3.5" />
          </Link>
        </>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Your rank appears after your first verified effort.</p>
      )}
    </div>
  );
}

const howItClimbs = [
  {
    icon: Layers,
    title: "Every effort counts",
    body: "Courses, judge, labs and assessments all feed one XP system — no single surface is a dead end.",
  },
  {
    icon: BadgeCheck,
    title: "Ranks you can prove",
    body: "Every earned badge and credential links to a public verification page.",
  },
  {
    icon: Gift,
    title: "One account, everything",
    body: "Cart, entitlements, billing and support live in the same place.",
  },
];

export function Dashboard() {
  const { user } = useSession();
  const reducedMotion = useReducedMotion() ?? false;
  const firstName = user?.display_name.split(" ")[0] ?? "there";

  return (
    <PageContainer className="pt-8 sm:pt-10">
      <OnboardingDialog />
      {/* Hero */}
      <motion.section
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-border/80 bg-card"
      >
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-45 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/8 blur-3xl" />

        <div className="relative z-10 grid gap-8 px-6 py-9 sm:px-10 sm:py-11 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your learning workspace</p>
            <h1 className="mt-4 max-w-2xl font-display text-[clamp(2.2rem,4vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.055em]">
              Good morning, {firstName}.
              <br />
              <span className="text-muted-foreground">Keep the momentum.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              One focused lesson today is enough to keep your skills moving forward. Your next step is waiting below.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button variant="default" size="lg" sheen glow asChild>
                <Link href="/courses">Find your next lesson <ArrowRight /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/judge">Practice a skill</Link>
              </Button>
            </div>
          </div>
          <div className="grid min-w-[230px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-border bg-white/75 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="size-2 rounded-full bg-success" /> Current focus</div>
              <p className="mt-3 font-display text-xl font-semibold tracking-[-0.03em]">One lesson at a time</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Short sessions beat perfect plans.</p>
            </div>
            <MomentumPanel userId={user?.id ?? ""} />
          </div>
        </div>
      </motion.section>

      <NextMove />

      {/* My learning — enrollments + progress from the mock state */}
      <MyLearning />

      <ProgressPulse userId={user?.id ?? ""} />

      {/* Surfaces */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-h2">
              Explore the platform
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Courses, judge, labs, assessments, ranks and commerce — pick a
              surface and start.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {surfaces.map((surface, i) => (
            <motion.div
              key={surface.slug}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { delay: 0.04 * i, duration: 0.4, ease: "easeOut" }}
            >
              <SurfaceCard surface={surface} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* How the climb works */}
      <section className="mt-12">
        <h2 className="font-display text-h2">
          How the climb works
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {howItClimbs.map((item, i) => (
            <motion.div
              key={item.title}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { delay: 0.05 * i, duration: 0.4, ease: "easeOut" }}
            >
              <Card className="h-full">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-primary">
                    <item.icon className="size-4" />
                  </div>
                  <CardTitle className="text-sm">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
