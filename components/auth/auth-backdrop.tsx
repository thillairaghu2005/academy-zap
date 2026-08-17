import * as React from "react";

/**
 * Shared auth screen backdrop: centered card over the grid + treatment.
 */
export function AuthBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-surface-2 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      <div className="relative z-10 w-full max-w-md animate-fade-up">{children}</div>
    </div>
  );
}
