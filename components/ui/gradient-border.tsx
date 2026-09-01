import * as React from "react";

import { cn } from "@/lib/utils";

type GradientBorderProps = React.ComponentProps<"div"> & {
  innerClassName?: string;
};

export function GradientBorder({ className, innerClassName, children, ...props }: GradientBorderProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[inherit] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-border)_60%,transparent),var(--color-border)_38%,transparent)] p-px",
        className,
      )}
    >
      <div className={cn("rounded-[inherit] bg-card", innerClassName)}>{children}</div>
    </div>
  );
}
