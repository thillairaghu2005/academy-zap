"use client";

import * as React from "react";
import Editor, { loader, type OnMount, type BeforeMount } from "@monaco-editor/react";

import type { IDEFile, IDESettings, IDETheme } from "@/types/ide";
import { getMonacoThemeName, registerMonacoThemes } from "@/lib/monaco";

if (typeof window !== "undefined") loader.config({ paths: { vs: "/vs" } });

interface IDEEditorProps {
  file: IDEFile | undefined;
  theme: IDETheme;
  settings: IDESettings;
  onChange: (value: string) => void;
  onMount: (editor: Parameters<OnMount>[0], monaco: Parameters<OnMount>[1]) => void;
}

export function IDEEditor({ file, theme, settings, onChange, onMount }: IDEEditorProps) {
  const beforeMount = React.useCallback<BeforeMount>((monaco) => {
    registerMonacoThemes(monaco);
  }, []);

  return (
    <Editor
      height="100%"
      language={file?.language === "plaintext" ? "plaintext" : file?.language ?? "plaintext"}
      value={file?.content ?? ""}
      theme={getMonacoThemeName(theme)}
      beforeMount={beforeMount}
      onMount={onMount}
      onChange={(value) => onChange(value ?? "")}
      loading={<div aria-label="Loading code editor" />}
      options={{
        ariaLabel: file ? `${file.name} editor` : "Code editor",
        accessibilitySupport: "on",
        minimap: { enabled: settings.minimap },
        fontSize: settings.fontSize,
        lineHeight: 21,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 14, bottom: 20 },
        wordWrap: settings.wordWrap ? "on" : "off",
        renderWhitespace: "selection",
        bracketPairColorization: { enabled: true },
        folding: true,
        cursorSmoothCaretAnimation: "on",
        cursorBlinking: "smooth",
        suggest: { showWords: true, showMethods: true, showFunctions: true },
        inlineSuggest: { enabled: true },
        find: { addExtraSpaceOnTop: true, autoFindInSelection: "multiline" },
      }}
    />
  );
}
