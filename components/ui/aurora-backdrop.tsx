import * as React from "react";

import { cn } from "@/lib/utils";

type AuroraBackdropProps = React.ComponentProps<"div">;

export function AuroraBackdrop({ className, children, ...props }: AuroraBackdropProps) {
  return (
    <div {...props} aria-hidden={children ? undefined : true} className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div aria-hidden="true" className="aurora absolute inset-0 opacity-80 blur-3xl" />
      {children}
    </div>
  );
}
