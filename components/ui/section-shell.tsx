import * as React from "react";

import { cn } from "@/lib/utils";
import { AuroraBackdrop } from "./aurora-backdrop";
import { Eyebrow } from "./eyebrow";

type SectionShellProps = React.ComponentProps<"section"> & {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  ambient?: boolean;
};

export function SectionShell({
  className,
  children,
  eyebrow,
  title,
  subtitle,
  ambient = false,
  ...props
}: SectionShellProps) {
  return (
    <section {...props} className={cn("relative isolate overflow-hidden py-20 sm:py-28", className)}>
      {/* ambient backdrop removed for flat UI */}
      <div className="relative z-[1] mx-auto w-full max-w-7xl px-5 sm:px-8">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        {title ? <h2 className="mt-4 max-w-3xl font-display text-h2">{title}</h2> : null}
        {subtitle ? <p className="mt-4 max-w-2xl text-body text-muted-foreground">{subtitle}</p> : null}
        {children ? <div className="mt-10">{children}</div> : null}
      </div>
    </section>
  );
}
