import { cva } from "class-variance-authority";

/**
 * CVA variants for Chip — kept in a separate file so chip.tsx (component)
 * and chip-variants.ts (non-component) form two clean Fast-Refresh modules.
 */
export const chipVariants = cva(
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
