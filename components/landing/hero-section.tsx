import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  CodeXml,
  FlaskConical,
  Play,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/** Single-hero treatment keeps the message focused and avoids invented slide content. */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      <div className="pointer-events-none absolute -right-32 top-20 size-96 rounded-full bg-primary/10 blur-3xl motion-safe:animate-glow-pulse" />
      <div className="pointer-events-none absolute -left-40 bottom-0 size-96 rounded-full bg-xp-mastery/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="max-w-2xl motion-safe:animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Practical learning, visible progress
          </div>
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-none tracking-tight sm:text-6xl lg:text-7xl">
            Learn the skill.
            <br />
            <span className="text-gradient-zap">Prove the climb.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Learn in hands-on courses, prove it in the code judge, and break things in isolated virtual labs. Every effort feeds one rank climb.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="gradient" size="lg" asChild>
              <Link href="/courses">
                Start learning <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/judge">
                <Play />
                Try a challenge
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {[
              "Courses with resume progress",
              "Python code challenges",
              "Isolated virtual labs",
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-success-strong" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-80 sm:min-h-96 motion-safe:animate-fade-in">
          <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-primary/15 via-card to-xp-mastery/15 shadow-2xl shadow-primary/10 sm:inset-8" />
          <div className="absolute inset-0 rounded-2xl border border-border bg-card/80 p-4 shadow-xl backdrop-blur-sm sm:p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Your learning loop
                </p>
                <p className="mt-1 font-display text-lg font-semibold">Learn → build → climb</p>
              </div>
              <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Sparkles className="size-4" />
              </div>
            </div>

            <div className="relative mt-5 grid gap-3">
              <div className="absolute bottom-8 left-5 top-8 w-px bg-border" />
              {[
                { icon: BookOpen, label: "Learn", detail: "Course lessons", tone: "bg-primary" },
                { icon: CodeXml, label: "Build", detail: "Judge submissions", tone: "bg-xp-completion" },
                { icon: FlaskConical, label: "Climb", detail: "Lab objectives", tone: "bg-xp-mastery" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="relative flex items-center gap-4 rounded-xl border border-border bg-background/80 p-4 transition-transform duration-300 hover:translate-x-1"
                >
                  <span className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-full ${item.tone} text-primary-foreground`}>
                    <item.icon className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span>
                  </span>
                  <ArrowRight className="ml-auto size-4 text-muted-foreground" />
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
              <span className="text-xs font-medium">One account. Every surface.</span>
              <span className="font-mono text-xs uppercase tracking-widest text-primary-foreground/70">zapsters.dev</span>
            </div>
          </div>
          <div className="absolute -right-2 top-8 size-16 rotate-12 rounded-2xl border border-primary/20 bg-primary/10 sm:-right-5 sm:size-20" />
          <div className="absolute -bottom-3 left-0 size-12 -rotate-12 rounded-xl border border-xp-mastery/20 bg-xp-mastery/10 sm:-left-4 sm:size-16" />
        </div>
      </div>
    </section>
  );
}
