"use client";

import dynamic from "next/dynamic";

import type { LabTerminalProps } from "@/components/lab/terminal";
import { TerminalSkeleton } from "@/components/shared/skeletons";

// xterm is browser-only (DOM + canvas/unicode internals) — never bundle it
// for the server. The fallback keeps layout stable while the chunk hydrates.
const LabTerminal = dynamic(
  () => import("@/components/lab/terminal").then((m) => m.LabTerminal),
  {
    ssr: false,
    loading: () => (
      <TerminalSkeleton />
    ),
  },
);

export function LabTerminalShell(props: LabTerminalProps) {
  return <LabTerminal {...props} />;
}
