/**
 * Markdown search/highlight utilities — kept in a separate file so
 * MarkdownRenderer.tsx (component) is a pure React module and Vite/
 * react-refresh Fast Refresh can hot-replace renderer state across edits.
 */

import * as React from "react";

export function countMatches(value: string, term: string): number {
  if (!term) return 0;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.match(new RegExp(escaped, "gi"))?.length ?? 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightText(text: string, term: string, startAt: number, current: number): React.ReactNode {
  if (!term) return text;
  const expression = new RegExp(escapeRegExp(term), "gi");
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let occurrence = 0;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(text)) !== null) {
    const matchIndex = startAt + occurrence;
    result.push(text.slice(lastIndex, match.index));
    result.push(<mark key={`${match.index}-${occurrence}`} data-current={matchIndex === current ? "true" : undefined}>{match[0]}</mark>);
    lastIndex = match.index + match[0].length;
    occurrence += 1;
  }
  result.push(text.slice(lastIndex));
  return result;
}
