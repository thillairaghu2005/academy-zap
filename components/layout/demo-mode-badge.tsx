"use client";

import { Info } from "lucide-react";

export function DemoModeBadge() {
  return (
    <div className="pointer-events-none fixed bottom-24 left-4 z-30 hidden items-center gap-1.5 rounded-full border border-primary/15 bg-card/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm backdrop-blur-sm sm:flex lg:bottom-4">
      <Info className="size-3" aria-hidden="true" />
      Frontend demo
    </div>
  );
}
