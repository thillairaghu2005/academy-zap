import * as React from "react";

import { cn } from "@/lib/utils";

interface PageContainerProps extends React.ComponentProps<"div"> {
  /** Constrains width further for prose-style content */
  narrow?: boolean;
  as?: React.ElementType;
}

/**
 * Global layout primitive — every subsystem page renders inside this so
 * spacing/pacing stays consistent across Content, Judge, Lab, Gamification,
 * Commerce and Admin UIs (build.md F0).
 */
export function PageContainer({
  className,
  narrow = false,
  as: Component = "div",
  ...props
}: PageContainerProps) {
  return (
    <Component
      className={cn(
        "mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12",
        narrow ? "max-w-3xl" : "max-w-7xl",
        className,
      )}
      {...props}
    />
  );
}
