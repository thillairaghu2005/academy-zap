"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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

function SurfaceCard({ surface }: { surface: SurfaceMeta }) {
  const Icon = surface.icon;

  return (
    <Link href={surface.href} className="group block h-full outline-none">
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/10 focus-visible:ring-2 focus-visible:ring-ring">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105",
              surface.accent,
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
  return (
    <PageContainer className="pt-10">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-70 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-violet-600/20 blur-3xl animate-glow-pulse" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 size-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 px-6 py-14 sm:px-10 sm:py-16">
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Learn. Build. <span className="text-gradient-zap">Climb.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Learn in hands-on courses, prove it in the code judge, and break
            things in isolated virtual labs — every effort feeds a single rank
            climb.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button variant="gradient" size="lg" asChild>
              <Link href="/courses">
                Start learning <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/judge">Explore the Judge</Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* My learning — enrollments + progress from the mock state */}
      <MyLearning />

      {/* Surfaces */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.4, ease: "easeOut" }}
            >
              <SurfaceCard surface={surface} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* How the climb works */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-bold tracking-tight">
          How the climb works
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {howItClimbs.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.4, ease: "easeOut" }}
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
