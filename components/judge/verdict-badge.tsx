import type { Verdict } from "@/lib/contracts/judge";
import { Badge } from "@/components/ui/badge";

/**
 * Verdict badge — the literal value from the event schema (§4.3) is used
 * verbatim; only the label + styling vary. Verdict literals must never be
 * renamed or remapped in the UI.
 */
const VERDICT_META: Record<
  Verdict,
  { label: string; variant: "accepted" | "wrong-answer" | "time-limit-exceeded" | "runtime-error" | "compile-error" }
> = {
  accepted: { label: "Accepted", variant: "accepted" },
  wrong_answer: { label: "Wrong Answer", variant: "wrong-answer" },
  time_limit_exceeded: { label: "Time Limit Exceeded", variant: "time-limit-exceeded" },
  runtime_error: { label: "Runtime Error", variant: "runtime-error" },
  compile_error: { label: "Compile Error", variant: "compile-error" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const meta = VERDICT_META[verdict];
  return (
    <Badge variant={meta.variant} title={`verdict: ${verdict}`}>
      {meta.label}
    </Badge>
  );
}

export function verdictLabel(verdict: Verdict): string {
  return VERDICT_META[verdict].label;
}
