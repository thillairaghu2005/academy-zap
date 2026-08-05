import Link from "next/link";
import { ArrowRight, BookOpen, Code2, FlaskConical, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Product banner links to real platform surfaces instead of advertising unsupported plans. */
export function PracticeBanner() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground">
      <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full border-8 border-primary-foreground/10" />
      <div className="pointer-events-none absolute -bottom-20 right-1/3 size-56 rounded-full bg-xp-mastery/30 blur-3xl" />
      <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:p-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">The full learning loop</p>
          <h2 className="mt-3 max-w-lg font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Don&apos;t stop at watching. Put the skill to work.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-primary-foreground/75 sm:text-base">
            Move from guided lessons to code submissions, then into a hands-on lab. Zapsters keeps the practice connected so each step has a reason.
          </p>
          <Button variant="secondary" className="mt-7" asChild>
            <Link href="/labs">
              Explore the labs <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          {[
            { icon: BookOpen, label: "Course lessons" },
            { icon: Code2, label: "Judge practice" },
            { icon: FlaskConical, label: "Virtual labs" },
            { icon: Trophy, label: "Visible rank" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur-sm">
              <item.icon className="size-5 text-primary-foreground/80" />
              <p className="mt-7 text-sm font-semibold">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
