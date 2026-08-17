import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingSpinnerProps extends React.SVGProps<SVGSVGElement> {
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({
  size = "md",
  className,
  ...props
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
  };

  return (
    <Loader2
      className={cn("animate-spin text-muted-foreground", sizeClasses[size], className)}
      {...props}
    />
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-[50dvh] w-full flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" className="text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

export function SectionLoading() {
  return (
    <div className="flex w-full items-center justify-center p-8">
      <LoadingSpinner />
    </div>
  );
}
