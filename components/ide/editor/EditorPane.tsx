"use client";

import * as React from "react";
import Editor, { loader, type OnMount, type BeforeMount } from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";

import type { IDEFile, IDEProblem, IDESettings, IDETheme } from "@/types/ide";
import type { IDEExecution } from "../IDE";
import { getMonacoThemeName, registerMonacoThemes } from "@/lib/monaco";
import { EditorHeader } from "./EditorHeader";
import styles from "../ide.module.css";

// Monaco is intentionally kept on the self-hosted AMD loader. Turbopack cannot
// resolve Monaco's worker entry, so bundler worker integration is not an option.
if (typeof window !== "undefined") loader.config({ paths: { vs: "/vs" } });

const FORMAT_LANGUAGES = new Set(["json", "javascript", "typescript", "css", "html"]);

export interface EditorPaneProps {
  file: IDEFile | undefined;
  theme: IDETheme;
  settings: IDESettings;
  saved: boolean;
  execution: IDEExecution;
  onChange: (value: string) => void;
  onMount: (editor: Parameters<OnMount>[0], monaco: Parameters<OnMount>[1]) => void;
  onCursorChange: (line: number, column: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFormat: () => void;
  onToggleWordWrap: () => void;
  onFullscreen: () => void;
}

export function EditorPane({ file, theme, settings, saved, execution, onChange, onMount, onCursorChange, onUndo, onRedo, onFormat, onToggleWordWrap, onFullscreen }: EditorPaneProps) {
  const [formatAvailable, setFormatAvailable] = React.useState(false);
  const monacoRef = React.useRef<Monaco | null>(null);
  const editorRef = React.useRef<Parameters<OnMount>[0] | null>(null);

  const beforeMount = React.useCallback<BeforeMount>((monaco) => {
    registerMonacoThemes(monaco);
  }, []);

  const handleMount = React.useCallback<OnMount>((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    const formatAction = editor.getAction("editor.action.formatDocument");
    setFormatAvailable(Boolean(formatAction && file && FORMAT_LANGUAGES.has(file.language)));
    const cursorDisposable = editor.onDidChangeCursorPosition(({ position }) => onCursorChange(position.lineNumber, position.column));
    onCursorChange(editor.getPosition()?.lineNumber ?? 1, editor.getPosition()?.column ?? 1);
    onMount(editor, monaco);
    return () => cursorDisposable.dispose();
  }, [file, onCursorChange, onMount]);

  React.useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;

    const result = execution.result;
    const diagnostic = result?.compile_output ?? result?.stderr ?? (execution.status === "compile_error" || execution.status === "runtime_error" || execution.status === "time_limit_exceeded" ? execution.detail : null);
    if (!diagnostic) {
      monaco.editor.setModelMarkers(model, "judge", []);
      return;
    }
    const lineMatch = diagnostic.match(/(?:line|:)(?:\s*)(\d+)/i);
    const line = lineMatch ? Math.max(1, Number(lineMatch[1])) : 1;
    const problem: IDEProblem = {
      message: diagnostic,
      severity: result?.verdict === "compile_error" ? "error" : "warning",
      file: file?.name,
      line,
    };
    monaco.editor.setModelMarkers(model, "judge", [{
      startLineNumber: line,
      startColumn: 1,
      endLineNumber: line,
      endColumn: model.getLineMaxColumn(line),
      message: problem.message,
      severity: problem.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
    }]);
  }, [execution, file?.name]);

  return (
    <section className={styles.editorPane} aria-label="Code editor">
      <EditorHeader file={file} saved={saved} onUndo={onUndo} onRedo={onRedo} onFormat={onFormat} formatAvailable={formatAvailable} wordWrap={settings.wordWrap} onToggleWordWrap={onToggleWordWrap} onFullscreen={onFullscreen} />
      <div className={styles.editorCanvas}>
        <Editor
          height="100%"
          language={file?.language === "plaintext" ? "plaintext" : file?.language ?? "plaintext"}
          value={file?.content ?? ""}
          theme={getMonacoThemeName(theme)}
          beforeMount={beforeMount}
          onMount={handleMount}
          onChange={(value) => onChange(value ?? "")}
          loading={<div className={styles.editorLoading}>Loading code canvas...</div>}
          options={{
            automaticLayout: true,
            fontFamily: "var(--font-mono)",
            fontSize: settings.fontSize,
            lineHeight: Math.round(settings.fontSize * 1.55),
            fontLigatures: false,
            minimap: { enabled: settings.minimap, renderCharacters: false, maxColumn: 80, scale: 1 },
            stickyScroll: { enabled: true, maxLineCount: 3 },
            renderLineHighlight: "all",
            renderLineHighlightOnlyWhenFocus: false,
            guides: { indentation: true, highlightActiveIndentation: true, bracketPairs: "active" },
            bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
            autoClosingBrackets: "languageDefined",
            autoClosingQuotes: "languageDefined",
            autoSurround: "languageDefined",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            cursorWidth: 2,
            multiCursorModifier: "ctrlCmd",
            smoothScrolling: true,
            scrollBeyondLastLine: false,
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
            padding: { top: 16, bottom: 16 },
            folding: true,
            foldingHighlight: false,
            showFoldingControls: "mouseover",
            wordWrap: settings.wordWrap ? "on" : "off",
            renderWhitespace: "selection",
            tabSize: 4,
            quickSuggestions: { other: true, comments: false, strings: false },
            suggestOnTriggerCharacters: true,
            parameterHints: { enabled: true },
            accessibilitySupport: "on",
            ariaLabel: "Code editor",
          }}
        />
      </div>
    </section>
  );
}
