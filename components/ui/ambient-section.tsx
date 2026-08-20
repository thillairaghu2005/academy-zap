import * as React from "react";

import { cn } from "@/lib/utils";
import { AuroraBackdrop } from "@/components/ui/aurora-backdrop";
import { GlowOrb } from "@/components/ui/glow-orb";
import { NoiseOverlay } from "@/components/ui/noise-overlay";

type AmbientSectionProps = React.ComponentProps<"section"> & {
  /** Signal strength of the signature aurora wash. */
  tone?: "subtle" | "strong";
  /** Place a glow orb near the top-left of the section. */
  orb?: boolean;
};

/**
 * Signature color moment (UI §1.1): every major marketing section shares the
 * same aurora wash + grain so the brand reads as one repeatable effect.
 */
export function AmbientSection({
  className,
  children,
  tone = "subtle",
  orb = false,
  ...props
}: AmbientSectionProps) {
  return (
    <section
      {...props}
      className={cn("relative isolate overflow-hidden", className)}
    >
      <AuroraBackdrop
        className={cn(
          tone === "strong"
            ? "opacity-100"
            : "opacity-40 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]",
        )}
      />
      {orb ? (
        <GlowOrb
          size={420}
          className="left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
        />
      ) : null}
      <NoiseOverlay className="opacity-40" />
      <div className="relative z-[1]">{children}</div>
    </section>
  );
}