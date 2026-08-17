"use client";

import Image from "next/image";
import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

import { Magnetic } from "@/components/motion/magnetic";
import { Button } from "@/components/ui/button";
import heroImage from "@/src/assets/images/hero.png";

/** The public landing hero: character illustration alongside the headline. */
export function HeroSection() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <section className="relative isolate overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-10 lg:py-28">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18, filter: "blur(5px)" }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            A better place to get good at hard things
          </div>
          <h1
            className="mt-7 max-w-xl leading-[0.98]"
            style={{ fontFamily: "'Geist Variable', sans-serif", fontWeight: 100, fontSize: "clamp(2.9rem,6vw,5.4rem)", letterSpacing: "-0.05em" }}
          >
            Learn with intent.
            <br />
            <span>Build with confidence.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            A focused learning workspace for people who want practical skills, useful feedback, and visible progress that compounds over time.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Magnetic>
              <Button size="lg" asChild>
                <Link href="/courses">Start learning</Link>
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
          className="relative z-10 flex items-end justify-center lg:justify-end"
        >
          <Image
            src={heroImage}
            alt="A student sitting on a beanbag, working on a laptop with books, coffee, and a backpack nearby"
            priority
            quality={90}
            className="w-full max-w-[420px] object-contain sm:max-w-[500px] lg:max-w-full"
            style={{ maxHeight: "520px" }}
          />
        </motion.div>
      </div>
    </section>
  );
}
