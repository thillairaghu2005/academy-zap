import { TrustHighlights } from "@/components/landing/trust-highlights";

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
        </div>

        <div className="min-w-0">
          <TrustHighlights />
        </div>
      </div>
    </section>
  );
}
