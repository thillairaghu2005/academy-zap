import { cva } from "class-variance-authority";

/**
 * CVA variants for Badge — kept in a separate file so badge.tsx (component)
 * and badge-variants.ts (non-component) form two clean Fast-Refresh modules.
 * Import from here when you need the variants without importing the component
 * (e.g. to compute a className for a non-React context).
 */
export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2.5 py-1 text-caption font-semibold transition-colors [&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
         default: "border-primary-border bg-primary-light text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border text-foreground",
        // Small text on white cards needs the darker -strong shade for WCAG AA.
        success: "border-transparent bg-success/10 text-success-strong",
        warning: "border-transparent bg-warning/10 text-warning-strong",
        info: "border-transparent bg-info/10 text-info-strong",
        // Verdict literals (F2) — styled distinctly, used verbatim
        accepted: "border-transparent bg-verdict-accepted/10 text-success-strong",
        "wrong-answer":
          "border-transparent bg-verdict-wrong-answer/10 text-danger-strong",
        "time-limit-exceeded":
          "border-transparent bg-verdict-time-limit-exceeded/10 text-warning-strong",
        "runtime-error":
          "border-transparent bg-verdict-runtime-error/10 text-danger-strong",
        "compile-error":
          "border-transparent bg-verdict-compile-error/10 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
