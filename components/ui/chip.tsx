import * as React from "react";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { chipVariants } from "./chip-variants";

export function Chip({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
  return <span {...props} className={cn(chipVariants({ variant }), className)} />;
}
