import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LastUpdatedProps extends React.HTMLAttributes<HTMLDivElement> {
  date: string | Date;
}

export function LastUpdated({ date, className, ...props }: LastUpdatedProps) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)} {...props}>
      <Clock className="size-4" />
      <span>Last updated: <time dateTime={new Date(date).toISOString()}>{formattedDate}</time></span>
    </div>
  );
}
