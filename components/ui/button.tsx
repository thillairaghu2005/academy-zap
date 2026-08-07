import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-small font-medium transition-[background-color,border-color,box-shadow,transform] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_6px_16px_rgb(37_99_235_/_18%)] hover:-translate-y-px hover:bg-primary-hover hover:shadow-[0_10px_22px_rgb(37_99_235_/_24%)] active:translate-y-0 active:scale-[0.98]",
        gradient:
          "bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-sm shadow-primary/20 hover:brightness-105 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-border bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]",
        ghost: "border border-transparent text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
         sm: "h-8 gap-1.5 rounded-md px-3 text-caption has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
      },
      sheen: {
        false: "",
        true: "relative overflow-hidden after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-1/3 after:-translate-x-[180%] after:skew-x-[-18deg] after:bg-white/20 after:transition-transform after:duration-slow hover:after:translate-x-[500%] [&>*]:relative",
      },
      glow: {
        false: "",
        true: "shadow-[0_0_26px_color-mix(in_oklab,var(--color-primary-glow)_26%,transparent)] hover:shadow-[0_0_38px_color-mix(in_oklab,var(--color-primary-glow)_38%,transparent)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  sheen,
  glow,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    sheen?: boolean;
    glow?: boolean;
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, sheen, glow, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
