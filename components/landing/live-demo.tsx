"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import { CheckCircle2, TerminalSquare } from "lucide-react";

import { cn } from "@/lib/utils";

const LINES = [
  "academy-zap $ parse events from traffic.json",
  "✓ 14,208 events parsed in 0.4s",
  "academy-zap $ run rule: detect-beaconing",
  "✓ rule passed — 3 candidate beacons flagged",
  "academy-zap $ verify objective: beaconing-detect",
  "✓ objective verified → rank tick +1",
];

/** Embedded live terminal demo for the marketing page. Types out a real-looking lab session. */
export function TerminalMock() {
  const reducedMotion = useReducedMotion() ?? false;
  const [count, setCount] = React.useState(reducedMotion ? LINES.length : 0);

  React.useEffect(() => {
    if (reducedMotion || count >= LINES.length) return;
    const timer = window.setTimeout(() => setCount((value) => value + 1), 480);
    return () => window.clearTimeout(timer);
  }, [count, reducedMotion]);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f14] text-white shadow-[0_28px_70px_rgb(12_15_20_/_45%)]"
      role="img"
      aria-label="Demo of a Zapsters lab session: parsing events, running a detection rule, and verifying an objective"
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-4 py-3">
        <span className="size-2.5 rounded-full bg-white/20" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-white/20" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-white/20" aria-hidden="true" />
        <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-white/60">
          <TerminalSquare className="size-3.5" /> zapsters — live lab session
        </span>
      </div>
      <div className="min-h-[190px] p-4 font-mono text-xs leading-6 sm:p-5 sm:text-[13px]">
        {LINES.slice(0, reducedMotion ? LINES.length : count).map((line, index) => (
          <p key={index} className={cn(index % 2 === 0 ? "text-white/65" : "text-white")}>
            {line}
          </p>
        ))}
        {!reducedMotion && count < LINES.length ? (
          <p className="text-white">
            <span className="inline-block h-3.5 w-2 animate-pulse bg-white/80 align-middle" aria-hidden="true" />
          </p>
        ) : (
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-success/20 px-3 py-1 text-[11px] font-semibold text-white">
            <CheckCircle2 className="size-3.5" /> Session verified — objective complete
          </p>
        )}
      </div>
    </div>
  );
}