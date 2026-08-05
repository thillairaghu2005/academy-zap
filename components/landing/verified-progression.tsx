import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";

const ranks = ["Initiate", "Oracle", "Spartan", "Titan", "Atlas", "Hyperion", "Olympian", "Primordial", "Ascendant", "Deus"] as const;

/** Real F5 vocabulary: rank ladder plus the two XP tracks that feed it. */
export function VerifiedProgression() {
  return (
    <section className="border-y border-border bg-foreground text-background">
      <div className="grid gap-10 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:px-12">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary-light">F5 / ProgressContext</p>
          <h2 className="mt-4 max-w-md font-display text-h2">
            Your rank is two tracks, not one score.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-background/70">
            Completion XP records what you finish. Mastery XP records what you can do. The server resolves both into the rank ladder.
          </p>
          <Button variant="gradient" className="mt-6" asChild>
            <Link href="/rank">
              Inspect the ladder <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="min-w-0 font-mono text-xs">
          <div className="flex items-center gap-3 border-b border-background/15 pb-4 text-background/55">
            <Trophy className="size-4 text-xp-mastery" />
            <span>rank_ladder / level 07</span>
            <span className="ml-auto text-success">verified</span>
          </div>
          <div className="flex gap-4 overflow-x-auto py-6" aria-label="Rank ladder">
            {ranks.map((rank, index) => (
              <div key={rank} className="min-w-20 shrink-0">
                <div className={index === 6 ? "h-1 bg-primary-light" : "h-px bg-background/25"} />
                <p className={index === 6 ? "mt-3 text-primary-light" : "mt-3 text-background/50"}>
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className={index === 6 ? "mt-1 font-semibold text-background" : "mt-1 text-background/60"}>{rank}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 border-t border-background/15 pt-5 sm:grid-cols-2">
            <div>
              <div className="flex justify-between text-background/55">
                <span>completion_xp</span>
                <span className="text-xp-completion">4,180</span>
              </div>
              <div className="mt-2 h-1 bg-background/15"><div className="h-1 w-3/5 bg-xp-completion" /></div>
            </div>
            <div>
              <div className="flex justify-between text-background/55">
                <span>mastery_xp</span>
                <span className="text-xp-mastery">3,240</span>
              </div>
              <div className="mt-2 h-1 bg-background/15"><div className="h-1 w-2/5 bg-xp-mastery" /></div>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 text-background/45">
            <ShieldCheck className="size-3.5 text-success" />
            <CheckCircle2 className="size-3.5 text-success" />
            ledger-derived, publicly verifiable
          </div>
        </div>
      </div>
    </section>
  );
}
