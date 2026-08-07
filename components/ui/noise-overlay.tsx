import * as React from "react";

import { cn } from "@/lib/utils";

export function NoiseOverlay({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn("bg-noise pointer-events-none absolute inset-0 opacity-60", className)}
    />
  );
}
