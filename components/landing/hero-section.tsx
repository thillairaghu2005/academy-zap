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
    <section className="border-b border-border bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8 lg:py-24">
        <div className="max-w-2xl motion-safe:animate-fade-up">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-primary-light">
            F2 / Judge Engine
          </p>
          <h1 className="mt-5 max-w-xl font-display text-5xl font-semibold leading-[1.04] tracking-tight text-background sm:text-6xl lg:text-7xl">
            Submit code.
            <br />
            <span className="text-primary-light">Get a verdict.</span>
            <br />
            Move up.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-background/70 sm:text-lg">
            Learn the pattern in a course, send the solution to the Judge, then take the same skill into an isolated Lab. Accepted work becomes part of your climb.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="gradient" size="lg" asChild>
              <Link href="/judge">
                Open the Judge <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="border-background/20 bg-transparent text-background hover:bg-background/10 hover:text-background" asChild>
              <Link href="/courses">Browse courses</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-background/55">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-success" /> Python first
            </span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-xp-completion" /> deterministic verdicts
            </span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-xp-mastery" /> dual XP tracks
            </span>
          </div>
        </div>

        <div className="relative motion-safe:animate-fade-in">
          <div className="border border-background/15 bg-background/[0.04] font-mono text-xs shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between border-b border-background/15 px-4 py-3 text-background/55 sm:px-5">
              <span className="flex items-center gap-2">
                <Code2 className="size-3.5" /> two-sum.py
              </span>
              <span>PYTHON / F2</span>
            </div>
            <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_0.85fr]">
              <div className="min-w-0">
                <div className="space-y-2 text-background/60">
                  <p><span className="text-primary-light">01</span> &nbsp;seen = {"{}"}</p>
                  <p><span className="text-primary-light">02</span> &nbsp;for i, num in enumerate(nums):</p>
                  <p><span className="text-primary-light">03</span> &nbsp;&nbsp;complement = target - num</p>
                  <p><span className="text-primary-light">04</span> &nbsp;&nbsp;if complement in seen:</p>
                  <p className="text-background/90"><span className="text-primary-light">05</span> &nbsp;&nbsp;&nbsp;&nbsp;return [seen[complement], i]</p>
                  <p><span className="text-primary-light">06</span> &nbsp;&nbsp;seen[num] = i</p>
                </div>
                <div className="mt-7 flex items-center gap-2 border-t border-background/10 pt-4 text-background/45">
                  <GitCommitHorizontal className="size-3.5" /> submit solution
                  <ChevronRight className="ml-auto size-3.5" />
                </div>
              </div>

              <div className="border-t border-background/10 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="size-4" />
                  <span className="font-semibold">verdict: accepted</span>
                </div>
                <dl className="mt-5 space-y-3 text-[11px]">
                  <div className="flex justify-between gap-4 text-background/55">
                    <dt>test_cases_passed</dt>
                    <dd className="text-background/90">12 / 12</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-background/55">
                    <dt>runtime_ms</dt>
                    <dd className="text-background/90">31</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-background/55">
                    <dt>xp_type</dt>
                    <dd className="text-xp-mastery">mastery</dd>
                  </div>
                </dl>
                <div className="mt-6 border-t border-background/10 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-background/40">rank ladder preview</p>
                  <div className="mt-3 flex items-center gap-2 text-background/80">
                    <Trophy className="size-4 text-xp-mastery" />
                    <span>Olympian</span>
                    <Zap className="ml-auto size-3.5 text-primary-light" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="border-l-2 border-xp-completion pl-2">
                      <p className="text-[10px] text-background/40">completion_xp</p>
                      <p className="mt-1 text-xp-completion">4,180</p>
                    </div>
                    <div className="border-l-2 border-xp-mastery pl-2">
                      <p className="text-[10px] text-background/40">mastery_xp</p>
                      <p className="mt-1 text-xp-mastery">3,240</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-background/15 px-4 py-3 text-[11px] text-background/45 sm:px-5">
              <ShieldCheck className="size-3.5 text-success" />
              accepted work is written to the XP ledger
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
