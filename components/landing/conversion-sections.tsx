"use client";

import * as React from "react";
import Link from "next/link";
import { m as motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  FlaskConical,
  ShieldCheck,
  X,
} from "lucide-react";

import { SectionTitle } from "@/components/landing/section-title";
import { AmbientSection } from "@/components/ui/ambient-section";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/* 2.2 — Technical capabilities bar                                   */
/* ------------------------------------------------------------------ */

const TECHNICAL_PILLARS = [
  "Hands-on Cloud Sandboxes",
  "Deterministic Code Judge",
  "Architecture Topologies",
  "Verifiable Skill Credentials",
  "Applied Incident Scenarios",
  "Dual XP Gamification",
] as const;

export function TrustBar() {
  return (
    <section aria-label="Zapsters technical learning pillars" className="bg-surface-1 py-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-medium text-muted-foreground">
          {TECHNICAL_PILLARS.map((pillar) => (
            <span key={pillar} className="inline-flex items-center">
              <span>{pillar}</span>
            </span>
          ))}
        </div>
      </div>
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
          title="Hands-On Execution, No Passive Theory"
          description="A standard tutorial provides a video. Zapsters provides an isolated lab environment, automated validation, and verifiable credentials."
        />
        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-3 bg-surface-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <div className="px-4 py-3 sm:px-6" />
            <div className="px-4 py-3 text-center sm:px-6">Generic Platforms</div>
            <div className="px-4 py-3 text-center text-foreground sm:px-6">Zapsters</div>
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
                <X className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="hidden sm:inline">{row.generic}</span>
                <span className="sm:hidden">No</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-4 py-3 text-center text-xs font-medium text-foreground sm:text-sm">
                <Check className="size-3.5 shrink-0 text-foreground" aria-hidden="true" />
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
  return `grid grid-cols-3 items-center ${index % 2 === 0 ? "bg-card" : "bg-surface-1/60"}`;
}

/* ------------------------------------------------------------------ */
/* 2.4 — Outcome stats band                                            */
/* ------------------------------------------------------------------ */

const PLATFORM_FACTS = [
  { label: "Core Technical Tracks", value: "6 Tracks", subtext: "Cloud, Security, AI & Systems" },
  { label: "Deterministic Code Judge", value: "100%", subtext: "Automated test-case verification" },
  { label: "Isolated Lab Sessions", value: "Zero Local Risk", subtext: "Browser-based sandbox environments" },
  { label: "Cryptographic Credentials", value: "Verifiable", subtext: "Publicly shareable achievement ledger" },
] as const;

export function StatsBand() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_FACTS.map((fact) => (
            <div key={fact.label} className="flex flex-col rounded-xl border border-border bg-surface-1 p-5">
              <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {fact.value}
              </span>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {fact.label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {fact.subtext}
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
  { icon: BadgeCheck, title: "Foundation", body: "Completed the detection fundamentals course with hands-on practice." },
  { icon: FlaskConical, title: "Applied in a lab", body: "Turned a detection rule into a verified, passing lab objective." },
  { icon: ShieldCheck, title: "Earned the credential", body: "Earned a verifiable rank credential recorded on the platform ledger." },
  { icon: ArrowRight, title: "Continuous practice", body: "Solves problems in the Judge engine and climbs the global ladder." },
] as const;

export function CaseStudySection() {
  return (
    <AmbientSection tone="subtle" className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionTitle
              title="Verified engineering progression"
              description="From syntax to applied systems defense. Every completed lab, challenge, and assessment builds an immutable record in your profile."
            />
            <div className="mt-6">
              <p className="text-sm font-semibold text-foreground">Priya S.</p>
              <p className="text-xs text-muted-foreground">Security Analyst · Active learner</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CASE_TIMELINE.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="h-full">
                  <Card className="h-full border border-border bg-card p-5">
                    <Icon className="mb-3 size-5 text-foreground" />
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {index + 1}. {step.title}
                    </p>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AmbientSection>
  );
}