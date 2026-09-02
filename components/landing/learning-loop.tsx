"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { m as motion, useInView, useReducedMotion } from "framer-motion";
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
import card1 from "@/src/assets/images/card1.png";
import card2 from "@/src/assets/images/card2.png";
import card3 from "@/src/assets/images/card3.png";

const steps = [
  {
    label: "01 / Learn",
    title: "Build the pattern",
    detail: "Courses give you the syntax, reasoning, and operating context before you practice.",
    href: "/courses",
    icon: BookOpen,
    image: card1,
    imageAlt: "3D illustration of a book, blocks, and a flag representing learning progression",
    // each card enters from a slightly different direction
    initial: { opacity: 0, scale: 0.92, x: -24, y: 20 },
  },
  {
    label: "02 / Build",
    title: "Prove it in the work",
    detail: "Send solutions to the Judge and take the same skill into an isolated Lab session.",
    href: "/judge",
    icon: Code2,
    image: card2,
    imageAlt: "3D illustration of a laptop with a code editor and a submission inbox",
    initial: { opacity: 0, scale: 0.92, x: 0, y: 28 },
  },
  {
    label: "03 / Climb",
    title: "Make progress visible",
    detail: "Verified work feeds your rank, streaks, guild, and two independent XP tracks.",
    href: "/rank",
    icon: Trophy,
    image: card3,
    imageAlt: "3D illustration of a trophy, staircase, bar chart, and target representing rank progression",
    initial: { opacity: 0, scale: 0.92, x: 24, y: 20 },
  },
] as const;

const flow = [
  { label: "Course lesson", icon: BookOpen },
  { label: "Judge submission", icon: Code2 },
  { label: "Lab objective", icon: FlaskConical },
  { label: "Rank tick", icon: Trophy },
] as const;

/** One compact explanation of the platform loop, from content to rank. */
export function LearningLoop() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <section id="how-it-works" ref={sectionRef} className="bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              The Zapsters loop
            </p>
            <h2
              className="mt-3 font-display font-thin text-h2 tracking-[-0.03em]"
            >Learn. Build. Climb.</h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Every surface hands off to the next one. Start with a concept, do
            the work in a real environment, and keep the verified result.
          </p>
        </div>

        <motion.div 
          className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-5 hover:border-primary/30 hover:shadow-md transition-all duration-500 relative overflow-hidden group"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground relative z-10">
            Verified handoff loop
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-4 relative z-10">
            {flow.map((event, index) => {
              const Icon = event.icon;
              return (
                <React.Fragment key={event.label}>
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 cursor-default transition-all duration-300 hover:scale-[1.02] hover:shadow-sm group/item"
                  >
                    <Icon className="size-4 text-muted-foreground group-hover/item:text-primary transition-colors" />
                    <span>{event.label}</span>
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
            return (
              <div key={step.label} className="rounded-xl">
                <Link
                  href={step.href}
                  className="group block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="relative h-full overflow-hidden border-border/80 p-5 transition-colors hover:border-border">
                    {index < steps.length - 1 ? (
                      <span className="absolute -right-2 top-1/2 z-10 hidden size-4 -translate-y-1/2 rotate-45 border-r border-t border-border bg-card lg:block" />
                    ) : null}

                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {step.label}
                      </span>
                      <Icon className="size-5 text-muted-foreground" />
                    </div>

                    {/* Card illustration */}
                    <motion.div
                      initial={reducedMotion ? false : step.initial}
                      animate={isInView ? { opacity: 1, scale: 1, x: 0, y: 0 } : undefined}
                      transition={{
                        delay: reducedMotion ? 0 : index * 0.12,
                        duration: 0.65,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="mt-4 flex justify-center"
                    >
                      <Image
                        src={step.image}
                        alt={step.imageAlt}
                        quality={90}
                        className="h-40 w-auto object-contain sm:h-44"
                        priority={index === 0}
                      />
                    </motion.div>

                    <h3
                      className="mt-4 font-display font-thin text-h3 tracking-[-0.02em]"
                    >
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.detail}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      Explore surface
                    </span>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-border bg-card p-4 font-mono text-xs sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
            <span className="flex items-center gap-2">
              <FlaskConical className="size-3.5 text-muted-foreground" />
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
            className="inline-flex items-center gap-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open a lab <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
