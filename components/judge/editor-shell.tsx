"use client";

import dynamic from "next/dynamic";

import type { EditorPaneProps } from "@/components/judge/editor-pane";
import { CodeEditorSkeleton } from "@/components/shared/skeletons";

// monaco-editor is browser-only — never let it reach the server bundle.
// The loading fallback keeps layout stable while the chunk hydrates.
const EditorPane = dynamic(
  () => import("@/components/judge/editor-pane").then((m) => m.EditorPane),
  {
    ssr: false,
    loading: () => (
      <CodeEditorSkeleton />
    ),
  },
);

export function EditorShell(props: EditorPaneProps) {
  return <EditorPane {...props} />;
}
