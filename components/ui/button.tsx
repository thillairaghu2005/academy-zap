import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-small font-semibold transition-[background-color,border-color,box-shadow,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
            "bg-primary text-primary-foreground shadow-[0_4px_12px_rgb(180_35_60_/_15%)] hover:bg-primary-hover hover:shadow-[0_4px_12px_rgb(180_35_60_/_18%)] active:bg-primary-active",
        gradient:
           "bg-primary text-primary-foreground shadow-[0_4px_12px_rgb(180_35_60_/_15%)] hover:bg-primary-hover hover:shadow-[0_4px_12px_rgb(180_35_60_/_18%)] active:bg-primary-active",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline:
           "border border-border-strong bg-white text-secondary-foreground hover:bg-secondary active:bg-border",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:border-border-strong hover:bg-surface-3 active:bg-border",
         ghost: "border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
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
        true: "relative overflow-hidden [&>*]:relative",
      },
      glow: {
        false: "",
         true: "shadow-[0_4px_12px_rgb(180_35_60_/_15%)] hover:shadow-[0_4px_12px_rgb(180_35_60_/_20%)]",
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
