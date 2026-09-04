import Link from "next/link";
import { CheckCircle2, ShieldCheck, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TrustBadge } from "@/components/shared/trust-badge";

const ranks = ["Initiate", "Oracle", "Spartan", "Titan", "Atlas", "Hyperion", "Olympian", "Primordial", "Ascendant", "Deus"] as const;

/** Real F5 vocabulary: rank ladder plus the two XP tracks that feed it. */
export function VerifiedProgression() {
  return (
    <section className="bg-surface-1 text-foreground">
      <div className="grid gap-10 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:px-12">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">F5 / ProgressContext</p>
          <h2
            className="mt-4 max-w-md text-h2"
            style={{ fontFamily: "'Geist Variable', sans-serif", fontWeight: 300, letterSpacing: "-0.03em" }}
          >
            Your rank is two tracks, not one score.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            Completion XP records what you finish. Mastery XP records what you can do. The server resolves both into the rank ladder.
          </p>
           <Button variant="default" className="mt-6" asChild>
            <Link href="/rank">
              Inspect the ladder
            </Link>
          </Button>
        </div>

        <div className="min-w-0 font-mono text-xs">
           <div className="flex items-center gap-3 border-b border-border pb-4 text-muted-foreground">
             <Trophy className="size-4 text-primary" />
            <span>rank_ladder / level 07</span>
            <span className="ml-auto text-success">verified</span>
          </div>
          <div className="flex gap-4 overflow-x-auto py-6" aria-label="Rank ladder">
            {ranks.map((rank, index) => (
              <div key={rank} className="min-w-20 shrink-0">
                 <div className={index === 6 ? "h-1 bg-primary" : "h-px bg-border-strong"} />
                 <p className={index === 6 ? "mt-3 text-primary" : "mt-3 text-muted-foreground"}>
                  {String(index + 1).padStart(2, "0")}
                </p>
                 <p className={index === 6 ? "mt-1 font-semibold text-foreground" : "mt-1 text-muted-foreground"}>{rank}</p>
              </div>
            ))}
          </div>
           <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
            <div>
               <div className="flex justify-between text-muted-foreground">
                <span>completion_xp</span>
                 <span className="text-primary">4,180</span>
              </div>
               <div className="mt-2 h-1 bg-border"><div className="h-1 w-3/5 bg-primary" /></div>
            </div>
            <div>
               <div className="flex justify-between text-muted-foreground">
                <span>mastery_xp</span>
                 <span className="text-secondary-accent">3,240</span>
              </div>
               <div className="mt-2 h-1 bg-border"><div className="h-1 w-2/5 bg-secondary-accent" /></div>
            </div>
          </div>
           <div className="mt-5 flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" />
            <CheckCircle2 className="size-3.5 text-success" />
            ledger-derived, publicly verifiable
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <TrustBadge kind="verified" label="Verified certificates" detail="Credentials link to an independent verification page." />
            <TrustBadge kind="community" label="Top companies learning here" detail="Mock partner signal from the current platform projection." />
          </div>
        </div>
      </div>
    </section>
  );
}
