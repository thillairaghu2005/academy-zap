import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-2xl border text-card-foreground transition-[border-color,background-color,box-shadow,transform] duration-base",
  {
    variants: {
      variant: {
        default: "border-border bg-card shadow-[0_10px_30px_rgb(17_24_39_/_4%)]",
        glass: "glass border-border/80 bg-card/55",
        glow: "border-border bg-card shadow-[0_0_34px_color-mix(in_oklab,var(--color-primary-glow)_10%,transparent)] hover:border-primary/30 hover:shadow-[0_18px_42px_rgb(37_99_235_/_10%)]",
        bento: "glass border-border/80 bg-surface-2/80 shadow-none",
        outline: "border-border bg-transparent shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Card({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-5", className)}
      {...props}
    />
  );
}

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
  as?: "h1" | "h2" | "h3" | "h4";
};

function CardTitle({ as: Heading = "h3", className, ...props }: CardTitleProps) {
  return (
    <Heading
      data-slot="card-title"
      className={cn("font-display text-h3", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-small text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("p-5 pt-0", className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-5 pt-0", className)}
      {...props}
    />
  );
}

export {
  Card,
  cardVariants,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
