import * as React from "react";

import { cn } from "@/lib/utils";

export function Eyebrow({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface-1/70 px-3 py-1 text-caption font-medium uppercase tracking-[0.16em] text-muted-foreground shadow-[0_0_22px_color-mix(in_oklab,var(--color-primary-glow)_10%,transparent)]",
        className,
      )}
    />
  );
}
