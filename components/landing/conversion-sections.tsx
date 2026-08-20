"use client";

import * as React from "react";
import Link from "next/link";
import { m as motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  FlaskConical,
  ShieldCheck,
  X,
} from "lucide-react";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { Marquee } from "@/components/motion/marquee";
import { SectionTitle } from "@/components/landing/section-title";
import { AmbientSection } from "@/components/ui/ambient-section";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* 2.2 — Logo trust bar                                                */
/* ------------------------------------------------------------------ */

const TRUST_MARKS = [
  "Northbridge Labs",
  "Hexwave",
  "Cipher Co-op",
  "Stackline",
  "Monolith Works",
  "Paperplane",
  "Darkmatter",
  "Kite & Co",
] as const;

export function TrustBar() {
  return (
    <section aria-label="Teams that use Zapsters" className="border-y border-border bg-surface-1 py-6">
      <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Trusted by security and engineering teams
      </p>
      <Marquee speed={32} className="mt-5 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <span aria-hidden="true" className="flex">
          {TRUST_MARKS.map((mark) => (
            <span
              key={mark}
              className="mx-5 inline-flex items-center gap-2 font-display text-lg font-semibold tracking-[-0.02em] text-muted-foreground/70"
            >
              <span className="size-2 rounded-full bg-primary/30" aria-hidden="true" />
              {mark}
            </span>
          ))}
        </span>
      </Marquee>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2.3 — Comparison: generic tutorial vs. Zapsters                     */
/* ------------------------------------------------------------------ */

const COMPARISON_ROWS: Array<{
  label: string;
  generic: string;
  zapsters: string;
  positive: boolean;
}> = [
  { label: "Hands-on environment", generic: "Watch-and-repeat", zapsters: "Live, isolated lab per session", positive: true },
  { label: "Practice feedback", generic: "Usually no judge", zapsters: "Automated judge with verdicts", positive: true },
  { label: "Progress proof", generic: "Checkmarks only", zapsters: "Verifiable credentials + rank", positive: true },
  { label: "Community signal", generic: "Comments", zapsters: "Guilds and public leaderboards", positive: true },
  { label: "Offline access", generic: "Sometimes", zapsters: "Built-in offline course reader", positive: true },
  { label: "Guaranteed pace", generic: "Self-motivation", zapsters: "Momentum streaks + next-move", positive: true },
];

export function ComparisonSection() {
  return (
    <AmbientSection tone="subtle" className="bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <SectionTitle
          title="Not another video library"
          description="A generic tutorial gives you a video. Zapsters gives you a working environment, a judge, and proof you can keep."
        />
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-3 border-b border-border bg-surface-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <div className="px-4 py-3 sm:px-6" />
            <div className="px-4 py-3 text-center sm:px-6">Generic tutorials</div>
            <div className="px-4 py-3 text-center text-primary sm:px-6">Zapsters</div>
          </div>
          {COMPARISON_ROWS.map((row, index) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: index * 0.04 }}
              className={cnRow(index)}
            >
              <div className="px-4 py-3 text-xs font-medium sm:px-6 sm:text-sm">{row.label}</div>
              <div className="flex items-center justify-center gap-1.5 px-4 py-3 text-center text-xs text-muted-foreground sm:text-sm">
                <X className="size-3.5 shrink-0 text-border-strong" aria-hidden="true" />
                <span className="hidden sm:inline">{row.generic}</span>
                <span className="sm:hidden">No</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-4 py-3 text-center text-xs font-medium text-foreground sm:text-sm">
                <Check className={cn("size-3.5 shrink-0 text-success-strong")} aria-hidden="true" />
                <span>{row.zapsters}</span>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/register">Start learning free</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/courses">Browse the catalog</Link>
          </Button>
        </div>
      </div>
    </AmbientSection>
  );
}

function cnRow(index: number): string {
  return `grid grid-cols-3 items-center border-b border-border last:border-0 ${index % 2 === 0 ? "bg-card" : "bg-surface-1/60"}`;
}

/* ------------------------------------------------------------------ */
/* 2.4 — Outcome stats band                                            */
/* ------------------------------------------------------------------ */

const STATS = [
  { label: "Learners online", value: 1204, suffix: "+" },
  { label: "Judge submissions verified", value: 14208, suffix: "+" },
  { label: "Lab objectives completed", value: 3180, suffix: "+" },
  { label: "Verified credentials issued", value: 640, suffix: "+" },
] as const;

function StatValue({ value, suffix }: { value: number; suffix: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reducedMotion = useReducedMotion() ?? false;
  return (
    <span ref={ref} className="font-display text-4xl font-semibold tabular-nums tracking-[-0.05em] sm:text-5xl">
      {inView && !reducedMotion ? <AnimatedNumber value={value} countUpOnMount /> : value.toLocaleString()}
      {suffix}
    </span>
  );
}

export function StatsBand() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-3xl border border-primary-border bg-primary-muted px-6 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <StatValue value={stat.value} suffix={stat.suffix} />
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2.5 — Learner case-study                                            */
/* ------------------------------------------------------------------ */

const CASE_TIMELINE = [
  { icon: BadgeCheck, title: "Foundation", body: "Completed the detection fundamentals course in two weeks." },
  { icon: FlaskConical, title: "Applied in a lab", body: "Turned a detection rule into a verified lab objective." },
  { icon: ShieldCheck, title: "Earned the credential", body: "Graduated to a verifiable rank credential she can share." },
  { icon: ArrowRight, title: "Now", body: "Hunting in the Judge on weekends, ranked top-50 on the board." },
] as const;

export function CaseStudySection() {
  return (
    <AmbientSection tone="subtle" className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionTitle
              title="One learner, one visible path"
              description="Priya started with zero detection experience. Every step below is a verified record in her profile — not a story she had to retell."
            />
            <div className="mt-6 flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-full border border-primary/25 bg-primary/10 font-display text-lg font-semibold text-primary">
                P
              </div>
              <div>
                <p className="text-sm font-semibold">Priya S.</p>
                <p className="text-xs text-muted-foreground">Detection analyst · ranked #48 this week</p>
              </div>
            </div>
          </div>

          <ol className="relative ml-3 border-l border-border pl-8">
            {CASE_TIMELINE.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pb-8 last:pb-0"
                >
                  <span className="absolute -left-[41px] top-0 grid size-6 place-items-center rounded-full border border-border bg-card text-primary">
                    <Icon className="size-3" />
                  </span>
                  <Card className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{step.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </Card>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </AmbientSection>
  );
}