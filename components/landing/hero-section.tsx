"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CirclePlay,
  Code2,
  Flame,
  LineChart,
  Sparkles,
} from "lucide-react";

import { Magnetic } from "@/components/motion/magnetic";
import { Spotlight } from "@/components/motion/spotlight";
import { Button } from "@/components/ui/button";

const glyphs = [
  { value: "</>", className: "left-[8%] top-[21%] rotate-[-10deg]" },
  { value: "01", className: "right-[10%] top-[18%] rotate-[8deg]" },
  { value: "∑", className: "right-[5%] bottom-[24%] rotate-[-7deg]" },
  { value: "{ }", className: "left-[4%] bottom-[18%] rotate-[9deg]" },
] as const;

function WorkspacePreview() {
  return (
    <Spotlight className="rounded-[28px]">
      <div className="relative overflow-hidden rounded-[28px] border border-border/80 bg-white shadow-[0_30px_80px_rgb(17_24_39_/_12%)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-[10px] bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">Today&apos;s workspace</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Tuesday, 14 May</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success-strong">
            <span className="size-1.5 rounded-full bg-success" /> On track
          </span>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl bg-surface-1 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
                <BookOpen className="size-4 text-primary" />
                Your next lesson
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">12 min</span>
            </div>
            <h2 className="mt-5 max-w-[15rem] font-display text-xl font-semibold leading-tight tracking-[-0.03em]">
              Threat modeling for real products
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Turn a vague risk into a useful engineering decision.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="relative size-12 shrink-0">
                <svg className="size-12 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                  <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-primary)" strokeDasharray="113" strokeDashoffset="25" strokeLinecap="round" strokeWidth="3" />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold text-primary">78%</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Security foundations</p>
                <p className="mt-1 text-[11px] text-muted-foreground">8 of 10 lessons complete</p>
              </div>
            </div>
            <Button size="sm" className="mt-6 w-full" asChild>
              <Link href="/courses">Continue learning <ArrowRight /></Link>
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-medium">
                  <LineChart className="size-4 text-primary" /> Weekly rhythm
                </span>
                <span className="text-[11px] font-medium text-success-strong">+24%</span>
              </div>
              <div className="mt-5 flex h-16 items-end gap-1.5" aria-label="Learning activity across the week">
                {[34, 48, 42, 68, 55, 84, 62, 92, 74, 100, 82, 91].map((height, index) => (
                  <span key={index} className="min-w-0 flex-1 rounded-t-md bg-primary/15" style={{ height: `${height}%` }}>
                    <span className="block h-full rounded-t-md bg-primary" style={{ opacity: index > 7 ? 0.9 : 0.34 }} />
                  </span>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-muted-foreground"><span>Mon</span><span>Today</span><span>Sun</span></div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium">Recent milestones</span>
                <span className="text-[11px] text-muted-foreground">This week</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="grid size-6 place-items-center rounded-full bg-success/10 text-success-strong"><Check className="size-3.5" /></span>
                  <span className="min-w-0 flex-1 truncate">Completed access control lab</span>
                  <span className="font-mono text-[10px] text-muted-foreground">+120 XP</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary"><CirclePlay className="size-3.5" /></span>
                  <span className="min-w-0 flex-1 truncate">Started API security track</span>
                  <span className="font-mono text-[10px] text-muted-foreground">2h ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
          <Flame className="size-3.5 text-primary" />
          <span>4 day learning streak</span>
          <ChevronRight className="ml-auto size-3.5" />
        </div>
      </div>
    </Spotlight>
  );
}

/** The public landing signature: a calm workspace preview instead of a generic LMS banner. */
export function HeroSection() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <section className="relative isolate overflow-hidden border-b border-border bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/2 top-[-18rem] size-[38rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      {glyphs.map((glyph, index) => (
        <span
          key={glyph.value}
          aria-hidden="true"
          className={`pointer-events-none absolute hidden font-mono text-sm text-muted-foreground/25 motion-safe:animate-drift sm:block ${glyph.className}`}
          style={{ animationDelay: `${index * -2.4}s` }}
        >
          {glyph.value}
        </span>
      ))}

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-10 lg:py-28">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18, filter: "blur(5px)" }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> A better place to get good at hard things
          </div>
          <h1 className="mt-7 max-w-xl font-display text-[clamp(2.9rem,6vw,5.4rem)] font-semibold leading-[0.98] tracking-[-0.065em]">
            Learn with intent.
            <br />
            <span className="text-primary">Build with confidence.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            A focused learning workspace for people who want practical skills, useful feedback, and visible progress that compounds over time.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Magnetic>
              <Button size="lg" sheen glow asChild>
                <Link href="/courses">Start learning <ArrowRight /></Link>
              </Button>
            </Magnetic>
            <Button variant="outline" size="lg" asChild>
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-success-strong" /> Short, focused lessons</span>
            <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-success-strong" /> Hands-on practice</span>
            <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-success-strong" /> Progress you can see</span>
          </div>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: reducedMotion ? 0 : 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 lg:pt-6"
        >
          <div className="absolute -inset-6 rounded-[40px] bg-primary/5 blur-2xl" aria-hidden="true" />
          <WorkspacePreview />
          <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-border bg-white px-3.5 py-3 shadow-[0_16px_35px_rgb(17_24_39_/_10%)] sm:flex">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Code2 className="size-4" /></span>
            <div><p className="text-xs font-semibold">Practice, not passive watching</p><p className="mt-0.5 text-[11px] text-muted-foreground">Apply the idea while it&apos;s fresh</p></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
