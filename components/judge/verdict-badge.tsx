import type { Verdict } from "@/lib/contracts/judge";
import { Badge } from "@/components/ui/badge";
import { VERDICT_META } from "./verdict-meta";

// VERDICT_META and verdictLabel live in ./verdict-meta.ts so this file is a
// pure React module for Vite/react-refresh Fast Refresh.
// BottomPanel.tsx imports verdictLabel from verdict-meta directly.

/**
 * Verdict badge — the literal value from the event schema (§4.3) is used
 * verbatim; only the label + styling vary. Verdict literals must never be
 * renamed or remapped in the UI.
 */
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const meta = VERDICT_META[verdict];
  return (
    <Badge variant="outline" title={`verdict: ${verdict}`}>
      {meta.label}
    </Badge>
  );
}
