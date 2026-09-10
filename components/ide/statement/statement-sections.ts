/**
 * Statement section definitions — kept in a separate file so SectionNav.tsx
 * (component) is a pure React module and Vite/react-refresh Fast Refresh
 * can hot-replace nav state across edits.
 */

export const STATEMENT_SECTIONS = [
  { id: "description", label: "Description" },
  { id: "examples", label: "Examples" },
  { id: "constraints", label: "Constraints" },
  { id: "limits", label: "Limits" },
  { id: "hints", label: "Hints" },
  { id: "editorial", label: "Editorial" },
  { id: "discussion", label: "Discussion" },
] as const;
