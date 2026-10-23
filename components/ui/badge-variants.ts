import { cva } from "class-variance-authority";

/**
 * CVA variants for Badge — kept in a separate file so badge.tsx (component)
 * and badge-variants.ts (non-component) form two clean Fast-Refresh modules.
 * Import from here when you need the variants without importing the component
 * (e.g. to compute a className for a non-React context).
 */
export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-caption font-medium transition-colors [&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-foreground font-medium",
        secondary: "border-border bg-secondary text-secondary-foreground",
        destructive: "border-border bg-secondary text-foreground",
        outline: "border-border text-foreground",
        success: "border-border bg-secondary text-foreground",
        warning: "border-border bg-secondary text-foreground",
        info: "border-border bg-secondary text-foreground",
        accepted: "border-border bg-secondary text-foreground font-semibold",
        "wrong-answer": "border-border bg-secondary text-foreground font-semibold",
        "time-limit-exceeded": "border-border bg-secondary text-foreground",
        "runtime-error": "border-border bg-secondary text-foreground",
        "compile-error": "border-border bg-secondary text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
