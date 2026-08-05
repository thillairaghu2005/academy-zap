import * as React from "react";

/**
 * Shared auth screen backdrop: centered card over the grid + glow treatment.
 */
export function AuthBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -left-32 top-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-primary-light/60 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-0 size-64 rounded-full bg-xp-mastery/10 blur-3xl" />
      <div className="relative z-10 w-full max-w-md animate-fade-up">{children}</div>
    </div>
  );
}
