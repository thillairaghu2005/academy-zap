"use client";

import * as React from "react";
import Image from "next/image";
import { m as motion, useInView, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Code2,
  Trophy,
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
    icon: Code2,
    image: card2,
    imageAlt: "3D illustration of a laptop with a code editor and a submission inbox",
    initial: { opacity: 0, scale: 0.92, x: 0, y: 28 },
  },
  {
    label: "03 / Climb",
    title: "Make progress visible",
    detail: "Verified work feeds your rank, streaks, guild, and two independent XP tracks.",
    icon: Trophy,
    image: card3,
    imageAlt: "3D illustration of a trophy, staircase, bar chart, and target representing rank progression",
    initial: { opacity: 0, scale: 0.92, x: 24, y: 20 },
  },
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
            <h2
              className="font-display font-light text-h2 tracking-[-0.03em]"
            >Learn. Build. Climb.</h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Every surface hands off to the next one. Start with a concept, do
            the work in a real environment, and keep the verified result.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="rounded-xl h-full">
                <div className="group block h-full outline-none">
                  <Card className="relative h-full overflow-hidden border-border/80 p-5 transition-colors">
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
                      className="mt-4 font-display font-light text-h3 tracking-[-0.02em]"
                    >
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.detail}
                    </p>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
