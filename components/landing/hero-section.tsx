import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Code2,
  GitCommitHorizontal,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/** The landing signature: an accepted submission rendered as a rank-producing artifact. */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background text-foreground">
      <div className="pointer-events-none absolute -right-32 -top-48 size-[34rem] rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8 lg:py-28">
        <div className="max-w-2xl motion-safe:animate-fade-up">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-primary">
            F2 / Judge Engine
          </p>
          <h1 className="mt-5 max-w-xl font-display text-hero text-foreground">
            Submit code.
            <br />
            <span className="text-primary">Get a verdict.</span>
            <br />
            Move up.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Learn the pattern in a course, send the solution to the Judge, then take the same skill into an isolated Lab. Accepted work becomes part of your climb.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="default" size="lg" sheen glow asChild>
              <Link href="/judge">
                Open the Judge <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/courses">Browse courses</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
            <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-success" /> Python first</span>
            <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" /> deterministic verdicts</span>
            <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-secondary-accent" /> dual XP tracks</span>
          </div>
        </div>

        <div className="relative motion-safe:animate-fade-in">
          <div className="rounded-3xl border border-border bg-surface-1 font-mono text-xs shadow-[0_24px_70px_rgb(37_99_235_/_10%)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 text-muted-foreground sm:px-5">
              <span className="flex items-center gap-2"><Code2 className="size-3.5" /> two-sum.py</span>
              <span>PYTHON / F2</span>
            </div>
            <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_0.85fr]">
              <div className="min-w-0">
                <div className="space-y-2 text-muted-foreground">
                  <p><span className="text-primary">01</span> &nbsp;seen = {"{}"}</p>
                  <p><span className="text-primary">02</span> &nbsp;for i, num in enumerate(nums):</p>
                  <p><span className="text-primary">03</span> &nbsp;&nbsp;complement = target - num</p>
                  <p><span className="text-primary">04</span> &nbsp;&nbsp;if complement in seen:</p>
                  <p className="text-foreground"><span className="text-primary">05</span> &nbsp;&nbsp;&nbsp;&nbsp;return [seen[complement], i]</p>
                  <p><span className="text-primary">06</span> &nbsp;&nbsp;seen[num] = i</p>
                </div>
                <div className="mt-7 flex items-center gap-2 border-t border-border pt-4 text-muted-foreground">
                  <GitCommitHorizontal className="size-3.5" /> submit solution
                  <ChevronRight className="ml-auto size-3.5" />
                </div>
              </div>

              <div className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <div className="flex items-center gap-2 text-success-strong">
                  <CheckCircle2 className="size-4" />
                  <span className="font-semibold">verdict: accepted</span>
                </div>
                <dl className="mt-5 space-y-3 text-[11px]">
                  <div className="flex justify-between gap-4 text-muted-foreground"><dt>test_cases_passed</dt><dd className="text-foreground">12 / 12</dd></div>
                  <div className="flex justify-between gap-4 text-muted-foreground"><dt>runtime_ms</dt><dd className="text-foreground">31</dd></div>
                  <div className="flex justify-between gap-4 text-muted-foreground"><dt>xp_type</dt><dd className="text-primary">mastery</dd></div>
                </dl>
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">rank ladder preview</p>
                  <div className="mt-3 flex items-center gap-2 text-foreground">
                    <Trophy className="size-4 text-primary" /><span>Olympian</span><Zap className="ml-auto size-3.5 text-primary" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="border-l-2 border-primary pl-2"><p className="text-[10px] text-muted-foreground">completion_xp</p><p className="mt-1 text-primary">4,180</p></div>
                    <div className="border-l-2 border-secondary-accent pl-2"><p className="text-[10px] text-muted-foreground">mastery_xp</p><p className="mt-1 text-secondary-accent">3,240</p></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
              <ShieldCheck className="size-3.5 text-success" /> accepted work is written to the XP ledger
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
