"use client";

import Link from "next/link";
import Image from "next/image";
import { m as motion, useReducedMotion, type Variants } from "framer-motion";
import { Check } from "lucide-react";

import { Magnetic } from "@/components/motion/magnetic";
import { Parallax } from "@/components/motion/parallax";
import { TextReveal } from "@/components/motion/text-reveal";
import { TextScramble } from "@/components/motion/text-scramble";
import { motionDurations, motionEasings, motionSprings } from "@/components/motion/motion-tokens";
import { Button } from "@/components/ui/button";
import { GlowOrb } from "@/components/ui/glow-orb";
import heroImage from "@/src/assets/images/hero.png";
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
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12 lg:px-10 lg:py-10">
        <motion.div
          initial={reducedMotion ? false : "hidden"}
          animate={reducedMotion ? undefined : "show"}
          variants={containerVariants}
          className="relative z-10 max-w-2xl"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <TextScramble text="Interactive Learning Environment v2.0" className="tabular-nums" />
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="mt-5 max-w-2xl font-display font-light leading-[1.05] tracking-[-0.05em] text-[clamp(2.2rem,4.5vw,4rem)]"
          >
            <TextReveal text="Code. Defend. Advance." mode="words" delay={0.1} />
            {" "}
            <span className="inline-block overflow-hidden align-bottom">
              <motion.span
                aria-label="in real environments."
                initial={reducedMotion ? false : { opacity: 0, y: "100%" }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: motionDurations.slow, ease: motionEasings.out, delay: 0.5 }}
                className="inline-block font-medium text-primary"
              >
                in real environments.
              </motion.span>
            </span>
          </motion.h1>
          <motion.p variants={itemVariants} className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-[17px] sm:leading-8">
            Immersive labs, automated grading, and real-world scenarios designed to level up your engineering and security skills.
          </motion.p>
          <motion.div variants={itemVariants} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Magnetic>
              <Button size="lg" asChild>
                <Link href="/courses" onClick={() => trackConversion("hero_start_learning", "landing_hero")}>Start learning</Link>
              </Button>
            </Magnetic>
            <Button variant="outline" size="lg" asChild>
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
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
          className="relative z-10 flex items-center justify-center w-full"
        >
          <Parallax from={14} to={-14} className="w-full max-w-[500px] mx-auto flex justify-center">
            <Image 
              src={heroImage} 
              alt="Interactive learning environment" 
              priority 
              quality={90}
              className="w-full h-auto object-contain drop-shadow-2xl" 
            />
          </Parallax>
        </motion.div>
      </div>
    </section>
  );
}