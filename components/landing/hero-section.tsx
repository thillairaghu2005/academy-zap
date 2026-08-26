"use client";

import Link from "next/link";
import { m as motion, useReducedMotion, type Variants } from "framer-motion";
import { Check } from "lucide-react";

import { Magnetic } from "@/components/motion/magnetic";
import { Parallax } from "@/components/motion/parallax";
import { TextReveal } from "@/components/motion/text-reveal";
import { TextScramble } from "@/components/motion/text-scramble";
import { motionDurations, motionEasings, motionSprings } from "@/components/motion/motion-tokens";
import { JudgeMock } from "@/components/landing/judge-mock";
import { Button } from "@/components/ui/button";
import { GlowOrb } from "@/components/ui/glow-orb";
import { NoiseOverlay } from "@/components/ui/noise-overlay";
import { trackConversion } from "@/lib/analytics";

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    // Critically damped, no overshoot on text (§4); hints upward (§8).
    transition: motionSprings.default,
  },
};

/** The public landing hero: character illustration alongside the headline. */
export function HeroSection() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <section className="relative isolate overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" aria-hidden="true" />
      <div className="aurora pointer-events-none absolute inset-0 opacity-60 blur-3xl" aria-hidden="true" />
      <GlowOrb size={520} className="-left-40 top-1/3" />
      <NoiseOverlay className="opacity-50" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-10 lg:py-28">
        <motion.div
          initial={reducedMotion ? false : "hidden"}
          animate={reducedMotion ? undefined : "show"}
          variants={containerVariants}
          className="relative z-10 max-w-2xl"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <TextScramble text="A better place to get good at hard things" className="tabular-nums" />
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="mt-7 max-w-xl font-display font-thin leading-[0.98] tracking-[-0.05em] text-[clamp(2.9rem,6vw,5.4rem)]"
          >
            <TextReveal text="Learn with intent." mode="words" delay={0.1} />
            <span className="block overflow-hidden">
              <motion.span
                aria-label="Build with confidence."
                initial={reducedMotion ? false : { opacity: 0, y: "100%" }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: motionDurations.slow, ease: motionEasings.out, delay: 0.5 }}
                className="inline-block bg-gradient-to-r from-primary via-accent-strong to-primary bg-clip-text text-transparent"
              >
                Build with confidence.
              </motion.span>
            </span>
          </motion.h1>
          <motion.p variants={itemVariants} className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            A focused learning workspace for people who want practical skills, useful feedback, and visible progress that compounds over time.
          </motion.p>
          <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Magnetic>
              <Button size="lg" asChild>
                <Link href="/courses" onClick={() => trackConversion("hero_start_learning", "landing_hero")}>Start learning</Link>
              </Button>
            </Magnetic>
            <Button variant="outline" size="lg" asChild>
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants} className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-success-strong" /> Short, focused lessons</span>
            <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-success-strong" /> Hands-on practice</span>
            <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-success-strong" /> Progress you can see</span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={
            reducedMotion
              ? undefined
              : { ...motionSprings.default, delay: 0.1 }
          }
          className="relative z-10 flex items-end justify-center lg:justify-end"
        >
          <Parallax from={14} to={-14} className="w-full">
            <JudgeMock />
          </Parallax>
        </motion.div>
      </div>
    </section>
  );
}