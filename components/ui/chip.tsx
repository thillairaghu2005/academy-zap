import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-2/80 text-muted-foreground",
        accent: "border-primary/30 bg-primary/10 text-primary-glow",
        outline: "border-border-strong bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Chip({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
  return <span {...props} className={cn(chipVariants({ variant }), className)} />;
}

export { chipVariants };
