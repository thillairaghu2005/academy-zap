"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, Gift, Layers } from "lucide-react";

import type { SurfaceMeta } from "@/lib/surfaces";
import { surfaces } from "@/lib/surfaces";
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

function SurfaceCard({ surface }: { surface: SurfaceMeta }) {
  const Icon = surface.icon;

  return (
    <Link href={surface.href} className="group block h-full outline-none">
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/10 focus-visible:ring-2 focus-visible:ring-ring">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm transition-transform duration-300 group-hover:scale-105",
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{surface.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{surface.navLabel}</p>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {surface.tagline}
          </p>
          <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Explore
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </p>
        </CardContent>
      </Card>
    </Link>
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
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-xs font-medium text-primary">Platform rhythm</p>
              <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">Learn → apply</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Every surface connects to the next.</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* My learning — enrollments + progress from the mock state */}
      <MyLearning />

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
