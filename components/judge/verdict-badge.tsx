import type { Verdict } from "@/lib/contracts/judge";
import { Badge } from "@/components/ui/badge";

/**
 * Verdict badge — the literal value from the event schema (§4.3) is used
 * verbatim; only the label + styling vary. Verdict literals must never be
 * renamed or remapped in the UI.
 */
const VERDICT_META: Record<
  Verdict,
  { label: string }
> = {
  accepted: { label: "Accepted" },
  wrong_answer: { label: "Wrong Answer" },
  time_limit_exceeded: { label: "Time Limit Exceeded" },
  runtime_error: { label: "Runtime Error" },
  compile_error: { label: "Compile Error" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const meta = VERDICT_META[verdict];
  return (
    <Badge variant="outline" title={`verdict: ${verdict}`}>
      {meta.label}
    </Badge>
  );
}

export function verdictLabel(verdict: Verdict): string {
  return VERDICT_META[verdict].label;
}
