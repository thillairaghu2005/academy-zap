"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import type { SurfaceMeta, SurfaceStatus } from "@/lib/surfaces";
import { surfaces } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";

const statusChip: Record<
  SurfaceStatus,
  { label: string; dot: string; text: string }
> = {
  shipped: { label: "Live", dot: "bg-success", text: "text-success" },
  next: { label: "Next up", dot: "bg-info", text: "text-info" },
  stubbed: { label: "Stubbed", dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
};

function SurfaceCard({ surface }: { surface: SurfaceMeta }) {
  const Icon = surface.icon;
  const chip = statusChip[surface.status];

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
          <Badge variant="outline" className="ml-auto shrink-0">
            {surface.stage}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {surface.tagline}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className={cn("flex items-center gap-1.5 text-xs font-medium", chip.text)}>
              <span className={cn("size-1.5 rounded-full", chip.dot)} />
              {chip.label}
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const discipline = [
  {
    icon: FileText,
    title: "Contracts first",
    body: "lib/contracts/ transcribes every Pydantic schema field-for-field. Components consume the contract — never an invented shape.",
  },
  {
    icon: Boxes,
    title: "Swappable mocks",
    body: "lib/api/ is async-shaped with realistic latency today. The real backend is a function-body swap, not a UI rewrite (build.md §4).",
  },
  {
    icon: ShieldCheck,
    title: "Server always wins",
    body: "XP, ranks, streaks and verdicts are never computed in components — even in mock mode they come from the mock API (build.md §3).",
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
          <Badge variant="secondary" className="mb-5 gap-1.5 px-3 py-1">
            <Sparkles className="size-3" />
            Frontend build · F0 shell &amp; design system live
          </Badge>
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Learn. Build.{" "}
            <span className="text-gradient-zap">Climb.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Zapsters pairs Udemy-shaped courses, a HackerRank-shaped code judge
            and TryHackMe-shaped labs with a full gamification layer — built
            contract-first against the locked backend contracts, so the backend
            swap is a data-layer change, not a rewrite.
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

      {/* Surfaces */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Platform surfaces
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nine routes scaffolded, built in build.md order F1 → F7.
            </p>
          </div>
          <Badge variant="outline" className="mb-1">
            Next: F1 · Content Engine
          </Badge>
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

      {/* Integration discipline */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-bold tracking-tight">
          Why this integrates cleanly later
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {discipline.map((item, i) => (
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
