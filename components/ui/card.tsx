import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-xl border text-card-foreground transition-[border-color,background-color,box-shadow,transform] duration-200",
  {
    variants: {
      variant: {
        default: "border-border bg-card shadow-[0_4px_14px_rgb(23_23_23_/_4%)]",
        glass: "border-border bg-card shadow-[0_4px_14px_rgb(23_23_23_/_4%)]",
        glow: "border-border bg-card shadow-[0_4px_14px_rgb(23_23_23_/_4%)] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_10px_24px_rgb(142_3_26_/_10%)]",
        bento: "border-border bg-surface-2 shadow-none",
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
      className={cn("flex flex-col gap-1.5 p-5 sm:p-6", className)}
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
    <div data-slot="card-content" className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-5 pt-0 sm:p-6 sm:pt-0", className)}
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
