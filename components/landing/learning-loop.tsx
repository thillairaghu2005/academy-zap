"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  FlaskConical,
  Trophy,
  ArrowDown,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const steps = [
  {
    label: "01 / Learn",
    title: "Build the pattern",
    detail: "Courses give you the syntax, reasoning, and operating context before you practice.",
    href: "/courses",
    icon: BookOpen,
     tone: "text-primary",
  },
  {
    label: "02 / Build",
    title: "Prove it in the work",
    detail: "Send solutions to the Judge and take the same skill into an isolated Lab session.",
    href: "/judge",
    icon: Code2,
    tone: "text-primary",
  },
  {
    label: "03 / Climb",
    title: "Make progress visible",
    detail: "Verified work feeds your rank, streaks, guild, and two independent XP tracks.",
    href: "/rank",
    icon: Trophy,
     tone: "text-secondary-accent",
  },
] as const;

const flow = [
   { label: "Course lesson", icon: BookOpen, tone: "text-primary" },
  { label: "Judge submission", icon: Code2, tone: "text-primary" },
  { label: "Lab objective", icon: FlaskConical, tone: "text-success-strong" },
   { label: "Rank tick", icon: Trophy, tone: "text-secondary-accent" },
] as const;

/** One compact explanation of the platform loop, from content to rank. */
export function LearningLoop() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
  const reducedMotion = useReducedMotion();
  const [activeFlow, setActiveFlow] = React.useState(0);

  React.useEffect(() => {
    if (!isInView || reducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveFlow((current) => (current + 1) % flow.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [isInView, reducedMotion]);

  return (
    <section ref={sectionRef} className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">
              The Zapsters loop
            </p>
            <h2 className="mt-3 font-display text-h2">Learn. Build. Climb.</h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Every surface hands off to the next one. Start with a concept, do
            the work in a real environment, and keep the verified result.
          </p>
        </div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5 }}
          className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-5"
          aria-live="polite"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Verified handoff loop
            </p>
            <span className="text-xs text-muted-foreground">
              {flow[activeFlow]?.label} in progress
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {flow.map((event, index) => {
              const Icon = event.icon;
              const active = reducedMotion ? false : index === activeFlow;
              return (
                <React.Fragment key={event.label}>
                  <motion.div
                    animate={active ? { scale: 1.03, y: -2 } : { scale: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    <Icon className={cn("size-4", event.tone)} />
                    <span>{event.label}</span>
                    {active ? (
                      <motion.span
                        layoutId="learning-loop-pulse"
                        className="ml-auto size-1.5 rounded-full bg-primary"
                      />
                    ) : null}
                  </motion.div>
                  {index < flow.length - 1 ? (
                    <ArrowDown className="mx-auto size-3.5 text-border sm:hidden" />
                  ) : null}
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const active =
              !reducedMotion &&
              (index === 0
                ? activeFlow === 0
                : index === 1
                  ? activeFlow === 1 || activeFlow === 2
                  : activeFlow === 3);
            return (
              <motion.div
                key={step.label}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                animate={isInView ? { opacity: 1, y: 0 } : undefined}
                transition={{ delay: reducedMotion ? 0 : index * 0.1, duration: 0.45 }}
                className={cn(
                  "rounded-xl transition-shadow",
                  active && "shadow-lg shadow-primary/10",
                )}
              >
                <Link
                  href={step.href}
                  className="group block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                <Card className={cn(
                  "relative h-full border-border/80 p-5 transition-colors hover:border-primary/40 group-focus-visible:border-primary/60",
                  active && "border-primary/50 bg-primary/[0.03]",
                )}>
                  {index < steps.length - 1 ? (
                    <span className="absolute -right-2 top-1/2 z-10 hidden size-4 -translate-y-1/2 rotate-45 border-r border-t border-border bg-card lg:block" />
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {step.label}
                    </span>
                    <Icon className={`size-5 ${step.tone}`} />
                  </div>
                  <h3 className="mt-8 font-display text-h3 group-hover:text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                    Explore surface <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

         <div className="mt-5 grid gap-3 rounded-2xl border border-border bg-card p-4 font-mono text-xs sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
           <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
             <span className="flex items-center gap-2">
               <FlaskConical className="size-3.5 text-primary" />
               lab-session / objective-check
             </span>
             <span className="text-border-strong">→</span>
            <span className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-3.5" />
              server verified
            </span>
          </div>
          <Link
            href="/labs"
             className="inline-flex items-center gap-1.5 text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open a lab <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
