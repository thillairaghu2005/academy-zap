import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  FlaskConical,
  Trophy,
} from "lucide-react";

import { Card } from "@/components/ui/card";

const steps = [
  {
    label: "01 / Learn",
    title: "Build the pattern",
    detail: "Courses give you the syntax, reasoning, and operating context before you practice.",
    href: "/courses",
    icon: BookOpen,
    tone: "text-xp-completion",
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
    tone: "text-xp-mastery",
  },
] as const;

/** One compact explanation of the platform loop, from content to rank. */
export function LearningLoop() {
  return (
    <section className="border-y border-border bg-muted/40">
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

        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.label}
                href={step.href}
                className="group outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="relative h-full border-border/80 p-5 transition-colors hover:border-primary/40 group-focus-visible:border-primary/60">
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
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 rounded-xl border border-border bg-foreground p-4 font-mono text-xs text-background sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-background/65">
            <span className="flex items-center gap-2">
              <FlaskConical className="size-3.5 text-primary-light" />
              lab-session / objective-check
            </span>
            <span className="text-background/35">→</span>
            <span className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-3.5" />
              server verified
            </span>
          </div>
          <Link
            href="/labs"
            className="inline-flex items-center gap-1.5 text-primary-light outline-none hover:text-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open a lab <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
