"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { CodeEditorSkeleton } from "@/components/shared/skeletons";
import { JUDGE_LANGUAGE_CONFIG } from "@/lib/judge-language-config";

// Self-hosted Monaco. The default @monaco-editor/react loader fetches Monaco
// from a CDN at runtime; instead we point it at the AMD build synced to
// /public/vs by scripts/sync-monaco.mjs (postinstall/predev/prebuild hook).
// The AMD build bootstraps its own editor/json/css/html/ts workers from the
// same `vs/` base path, so no web-worker integration with the bundler is
// needed — Turbopack cannot resolve monaco's worker entry, and this sidesteps
// that entirely. Guarded for the server even though this module only loads
// client-side (editor-shell.tsx, ssr: false).
const MonacoEditor = dynamic(async () => {
  const monacoReact = await import("@monaco-editor/react");
  monacoReact.loader.config({ paths: { vs: "/vs" } });
  return monacoReact.default;
}, { ssr: false });

export interface EditorPaneProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
  /** theme key from our globals (maps to monaco's built-in themes) */
  theme?: "vs-dark" | "vs" | "hc-black";
}

/**
 * Monaco editor pane (Judge Engine, platform §2.7 — Monaco locked).
 * Loaded only on the client via next/dynamic (see editor-shell.tsx) — monaco
 * is never bundled for the server. Language modes are supplied by the active
 * editor configuration.
 */
export function EditorPane({
  value,
  onChange,
  language = JUDGE_LANGUAGE_CONFIG.python.editorLanguage,
  height = "100%",
  readOnly = false,
  theme = "vs",
}: EditorPaneProps) {
  return (
    <MonacoEditor
      height={height}
      language={language}
      value={value}
      onChange={(next) => onChange?.(next ?? "")}
      theme={theme}
      loading={<CodeEditorSkeleton />}
      options={{
        ariaLabel: "Code editor",
        accessibilitySupport: "on",
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 20,
        fontFamily: "var(--font-mono)",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        padding: { top: 12, bottom: 12 },
        wordWrap: "off",
        renderWhitespace: "selection",
        bracketPairColorization: { enabled: true },
        suggest: { showWords: true },
      }}
    />
  );
}
