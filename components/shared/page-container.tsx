import * as React from "react";

import { cn } from "@/lib/utils";

interface PageContainerProps extends React.ComponentProps<"div"> {
  /** Constrains width further for prose-style content */
  narrow?: boolean;
}

/**
 * Global layout primitive — every subsystem page renders inside this so
 * spacing/pacing stays consistent across Content, Judge, Lab, Gamification,
 * Commerce and Admin UIs (build.md F0).
 */
export function PageContainer({
  className,
  narrow = false,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14",
        narrow ? "max-w-3xl" : "max-w-7xl",
        className,
      )}
      {...props}
    />
  );
}
