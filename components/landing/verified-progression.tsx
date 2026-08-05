import Link from "next/link";
import { ArrowRight, BadgeCheck, GitBranch, ShieldCheck, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Uses the existing rank, badge, and verification surfaces instead of inventing vendor certifications. */
export function VerifiedProgression() {
  return (
    <section className="overflow-hidden rounded-3xl bg-foreground text-background">
      <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-light">Proof, not promises</p>
          <h2 className="mt-3 max-w-md font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Make progress you can show.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-background/70 sm:text-base">
            Your work flows into a visible rank, earned badges, and credentials with public verification pages.
          </p>
          <Button variant="gradient" className="mt-7" asChild>
            <Link href="/rank">
              See the rank ladder <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="relative grid gap-3 sm:grid-cols-3">
          {[
            { icon: GitBranch, title: "Practice", body: "Ship solutions in the Judge." },
            { icon: Trophy, title: "Progress", body: "Climb with two XP tracks." },
            { icon: ShieldCheck, title: "Verify", body: "Share badges with confidence." },
          ].map((item) => (
            <Card key={item.title} className="border-background/15 bg-background/10 p-5 text-background shadow-none backdrop-blur-sm">
              <item.icon className="size-5 text-primary-light" />
              <p className="mt-8 font-display font-semibold">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-background/65">{item.body}</p>
              <BadgeCheck className="mt-5 size-4 text-background/35" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
