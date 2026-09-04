import * as React from "react";

import { cn } from "@/lib/utils";

export interface SectionTitleProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Shared heading rhythm for the public landing page sections. */
export function SectionTitle({
  title,
  description,
  action,
  className,
}: SectionTitleProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        <h2
          className="text-h1"
          style={{ fontFamily: "'Geist Variable', sans-serif", fontWeight: 300, letterSpacing: "-0.03em" }}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-body text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
