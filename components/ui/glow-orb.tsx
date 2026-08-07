import * as React from "react";

import { cn } from "@/lib/utils";

type GlowOrbProps = React.ComponentProps<"div"> & {
  size?: number | string;
};

export function GlowOrb({ className, size = 360, style, ...props }: GlowOrbProps) {
  const orbStyle = {
    width: size,
    height: size,
    background:
      "radial-gradient(circle, color-mix(in oklab, var(--color-primary-glow) 42%, transparent), transparent 68%)",
    ...style,
  };

  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
      style={orbStyle}
    />
  );
}
