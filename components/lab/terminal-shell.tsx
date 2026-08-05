"use client";

import dynamic from "next/dynamic";

import type { LabTerminalProps } from "@/components/lab/terminal";

// xterm is browser-only (DOM + canvas/unicode internals) — never bundle it
// for the server. The fallback keeps layout stable while the chunk hydrates.
const LabTerminal = dynamic(
  () => import("@/components/lab/terminal").then((m) => m.LabTerminal),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-64 items-center justify-center gap-2 bg-[#0b0f14] text-sm text-muted-foreground">
        <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
        Booting terminal…
      </div>
    ),
  },
);

export function LabTerminalShell(props: LabTerminalProps) {
  return <LabTerminal {...props} />;
}
