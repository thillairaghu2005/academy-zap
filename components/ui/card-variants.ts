import { cva } from "class-variance-authority";

/**
 * CVA variants for Card — kept in a separate file so card.tsx (component)
 * and card-variants.ts (non-component) form two clean Fast-Refresh modules.
 */
export const cardVariants = cva(
       "rounded-xl border text-card-foreground transition-[border-color,background-color,box-shadow,transform] duration-200",
  {
    variants: {
      variant: {
         default: "border-border bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5",
         glass: "bg-card border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5",
         glow: "border-border bg-card shadow-sm hover:shadow-lg hover:border-primary-border hover:-translate-y-0.5",
        bento: "border-border bg-surface-2 shadow-none",
        outline: "border-border bg-transparent shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
