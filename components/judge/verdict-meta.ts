import type { Verdict } from "@/lib/contracts/judge";

/**
 * Verdict metadata and label helper — kept in a separate file so
 * verdict-badge.tsx (component) is a pure React module and Vite/
 * react-refresh Fast Refresh can hot-replace badge state across edits.
 */

export const VERDICT_META: Record<
  Verdict,
  { label: string }
> = {
  accepted: { label: "Accepted" },
  wrong_answer: { label: "Wrong Answer" },
  time_limit_exceeded: { label: "Time Limit Exceeded" },
  runtime_error: { label: "Runtime Error" },
  compile_error: { label: "Compile Error" },
};

export function verdictLabel(verdict: Verdict): string {
  return VERDICT_META[verdict].label;
}
