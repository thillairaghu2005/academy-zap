import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDot, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Concrete handoff panel for the two surfaces that make Zapsters distinct. */
export function PracticeBanner() {
  return (
    <section className="border-y border-border bg-background">
      <div className="grid gap-10 py-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">F2 → F3 handoff</p>
          <h2 className="mt-4 max-w-lg font-display text-h2">
            A passing submission is not the finish line.
          </h2>
          <p className="mt-4 max-w-xl text-body text-muted-foreground">
            Take the algorithm from the Judge into a terminal session. Labs check objectives against the session state, not a checkbox in the browser.
          </p>
          <Button variant="link" className="mt-5 h-auto p-0 font-semibold" asChild>
            <Link href="/labs">
              Open a lab session <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="border border-border bg-foreground p-4 font-mono text-xs text-background sm:p-6">
          <div className="flex items-center gap-2 border-b border-background/15 pb-4 text-background/55">
            <Terminal className="size-4" />
            <span>lab-session / linux-fundamentals</span>
            <span className="ml-auto text-success">RUNNING</span>
          </div>
          <div className="grid gap-3 py-5 text-background/65 sm:grid-cols-[1fr_auto]">
            <p><span className="text-primary-light">$</span> cat /root/flag.txt</p>
            <p className="text-success">flag captured</p>
            <p><span className="text-primary-light">$</span> check-objective linux-flag</p>
            <p className="flex items-center gap-2 text-success"><CheckCircle2 className="size-3.5" /> verified</p>
            <p><span className="text-primary-light">$</span> check-objective linux-sudo</p>
            <p className="flex items-center gap-2 text-background/45"><CircleDot className="size-3.5" /> waiting</p>
          </div>
          <div className="border-t border-background/15 pt-4 text-background/45">
            objective state is derived server-side
          </div>
        </div>
      </div>
    </section>
  );
}
