import { cva } from "class-variance-authority";

/**
 * CVA variants for Card — kept in a separate file so card.tsx (component)
 * and card-variants.ts (non-component) form two clean Fast-Refresh modules.
 */
export const cardVariants = cva(
  "rounded-xl border text-card-foreground transition-[border-color,background-color,box-shadow] duration-200",
  {
    variants: {
      variant: {
        default: "border-border bg-card shadow-sm",
        interactive:
          "border-border bg-card shadow-sm hover:border-border-strong hover:shadow-md transition-[border-color,box-shadow] duration-200 cursor-pointer",
        glass: "bg-card border-border shadow-sm",
        glow: "border-border bg-card shadow-sm hover:border-primary-border transition-colors duration-200",
        bento: "border-border bg-surface-2 shadow-none",
        outline: "border-border bg-transparent shadow-none",
        muted: "border-border bg-muted/40 shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
