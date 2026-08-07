"use client";

import * as React from "react";
import type { OnMount } from "@monaco-editor/react";

import type { Verdict } from "@/lib/contracts/judge";
import type { IDELanguage, IDETheme } from "@/types/ide";
import { getMonacoThemeName } from "@/lib/monaco";
import { useEditor } from "@/hooks/useEditor";
import { useFiles } from "@/hooks/useFiles";
import { useIDE } from "@/hooks/useIDE";
import { COMMAND_ICONS, type CommandPaletteAction } from "./shell/CommandPalette";
import type { IDEExecution, IDEProps } from "./IDE";
import type { IDELogEntry } from "./panel/BottomPanel";

const IDLE_EXECUTION: IDEExecution = { status: "idle" };
const SPLIT_STORAGE_KEY = "zapsters:ide:split";
const MIN_SPLIT = 34;
const MAX_SPLIT = 55;

function clampSplit(value: number): number {
  return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value));
}

function isVerdict(status: IDEExecution["status"]): status is Verdict {
  return status !== "idle" && status !== "running";
}

type WorkspaceProps = Pick<IDEProps, "initialFiles" | "storageKey" | "onActiveContentChange" | "resetKey" | "resetContent" | "primaryAction" | "onReset" | "execution">;

export function useIDEWorkspace({ initialFiles, storageKey = "ide:files", onActiveContentChange, resetKey = 0, resetContent = "", primaryAction, onReset, execution = IDLE_EXECUTION }: WorkspaceProps) {
  const workspaceRef = React.useRef<HTMLDivElement>(null);
  const chrome = useIDE();
  const filesState = useFiles(initialFiles, storageKey);
  const { settings, updateSettings } = useEditor();
  const active = filesState.active;
  const activeRef = React.useRef(active);
  const contentRef = React.useRef(active?.content ?? "");
  const currentPathRef = React.useRef(active?.path ?? "");
  const parentChangeTimer = React.useRef<number | null>(null);
  const persistTimer = React.useRef<number | null>(null);
  const runTimer = React.useRef<number | null>(null);
  const actionRef = React.useRef<{ run: () => void; submit: () => void; save: () => void }>({ run: () => undefined, submit: () => undefined, save: () => undefined });
  const editorRef = React.useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = React.useRef<Parameters<OnMount>[1] | null>(null);
  const handledResetKey = React.useRef(0);
  const lastLogStage = React.useRef<string | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [split, setSplit] = React.useState(() => {
    if (typeof window === "undefined") return 42;
    const fallback = window.innerWidth >= 1440 ? 38 : window.innerWidth < 1200 ? 44 : 42;
    try {
      const stored = Number(window.localStorage.getItem(SPLIT_STORAGE_KEY));
      return Number.isFinite(stored) ? clampSplit(stored) : fallback;
    } catch {
      return fallback;
    }
  });
  const [dragging, setDragging] = React.useState(false);
  const [localDirty, setLocalDirty] = React.useState(false);
  const [runBusy, setRunBusy] = React.useState(false);
  const [runExecution, setRunExecution] = React.useState<IDEExecution>(IDLE_EXECUTION);
  const [monacoReady, setMonacoReady] = React.useState(false);
  const [cursor, setCursor] = React.useState({ line: 1, column: 1 });
  const [mobileView, setMobileView] = React.useState<"problem" | "code" | "results">("code");
  const [statementVisible, setStatementVisible] = React.useState(true);
  const [logs, setLogs] = React.useState<IDELogEntry[]>([]);

  React.useEffect(() => {
    activeRef.current = active;
    if (active?.path !== currentPathRef.current) {
      currentPathRef.current = active?.path ?? "";
      contentRef.current = active?.content ?? "";
      const pathTimer = window.setTimeout(() => setLocalDirty(false), 0);
      if (active) onActiveContentChange?.(active.content, active);
      return () => window.clearTimeout(pathTimer);
    }
  }, [active, onActiveContentChange]);

  React.useEffect(() => {
    try { window.localStorage.setItem(SPLIT_STORAGE_KEY, String(split)); } catch { /* Local storage is optional. */ }
  }, [split]);

  React.useEffect(() => {
    if (resetKey <= 0 || resetKey === handledResetKey.current || !active) return;
    handledResetKey.current = resetKey;
    if (parentChangeTimer.current) window.clearTimeout(parentChangeTimer.current);
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    filesState.resetContent(active.path, resetContent);
    contentRef.current = resetContent;
    const resetTimer = window.setTimeout(() => setLocalDirty(false), 0);
    onActiveContentChange?.(resetContent, { ...active, content: resetContent, dirty: false });
    return () => window.clearTimeout(resetTimer);
  }, [active, filesState, onActiveContentChange, resetContent, resetKey]);

  React.useEffect(() => () => {
    if (parentChangeTimer.current) window.clearTimeout(parentChangeTimer.current);
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    if (runTimer.current) window.clearTimeout(runTimer.current);
  }, []);

  const flushSave = React.useCallback(() => {
    const file = activeRef.current;
    if (!file) return;
    if (parentChangeTimer.current) window.clearTimeout(parentChangeTimer.current);
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    filesState.updateContent(file.path, contentRef.current);
    setLocalDirty(false);
    onActiveContentChange?.(contentRef.current, { ...file, content: contentRef.current, dirty: false });
  }, [filesState, onActiveContentChange]);

  const handleChange = React.useCallback((content: string) => {
    const file = activeRef.current;
    if (!file) return;
    contentRef.current = content;
    setLocalDirty(true);
    if (parentChangeTimer.current) window.clearTimeout(parentChangeTimer.current);
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    parentChangeTimer.current = window.setTimeout(() => onActiveContentChange?.(contentRef.current, { ...file, content: contentRef.current, dirty: true }), 300);
    persistTimer.current = window.setTimeout(() => { filesState.updateContent(file.path, contentRef.current); setLocalDirty(false); }, 600);
    if (execution.status === "idle") setRunExecution(IDLE_EXECUTION);
  }, [execution.status, filesState, onActiveContentChange]);

  const handleRun = React.useCallback(() => {
    const file = activeRef.current;
    if (!file || runBusy) return;
    setRunBusy(true);
    setRunExecution({ status: "running", detail: file.language === "javascript" || file.language === "typescript" ? "Executing in the browser sandbox" : "Run is available for browser challenges" });
    chrome.setBottomPanel("console");
    chrome.setBottomPanelOpen(true);
    if (file.language === "javascript" || file.language === "typescript") chrome.runJavaScript(contentRef.current);
    if (runTimer.current) window.clearTimeout(runTimer.current);
    runTimer.current = window.setTimeout(() => { setRunBusy(false); setRunExecution(IDLE_EXECUTION); }, 650);
  }, [chrome, runBusy]);

  const handleReset = React.useCallback(() => {
    const file = activeRef.current;
    if (!file) return;
    filesState.resetContent(file.path, resetContent);
    contentRef.current = resetContent;
    setLocalDirty(false);
    onReset?.();
  }, [filesState, onReset, resetContent]);

  const handleMount = React.useCallback<OnMount>((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setMonacoReady(true);
    monaco.editor.setTheme(getMonacoThemeName(chrome.theme));
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => actionRef.current.run());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => actionRef.current.submit());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => actionRef.current.save());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => setPaletteOpen(true));
  }, [chrome.theme]);

  React.useEffect(() => {
    actionRef.current = { run: handleRun, submit: () => primaryAction?.onClick(), save: flushSave };
  }, [flushSave, handleRun, primaryAction]);

  const handleUndo = React.useCallback(() => { void editorRef.current?.getAction("undo")?.run(); }, []);
  const handleRedo = React.useCallback(() => { void editorRef.current?.getAction("redo")?.run(); }, []);
  const handleFormat = React.useCallback(() => { void editorRef.current?.getAction("editor.action.formatDocument")?.run(); }, []);
  const handleCursorChange = React.useCallback((line: number, column: number) => setCursor({ line, column }), []);
  const layoutEditor = React.useCallback(() => editorRef.current?.layout(), []);
  const colorizeCode = React.useCallback(async (code: string, language: string) => monacoReady && monacoRef.current ? monacoRef.current.editor.colorize(code, language, {}) : code, [monacoReady]);
  const toggleFullscreen = React.useCallback(() => { if (document.fullscreenElement) void document.exitFullscreen(); else void workspaceRef.current?.requestFullscreen(); }, []);
  const togglePanel = React.useCallback(() => chrome.setBottomPanelOpen(!chrome.bottomPanelOpen), [chrome]);

  React.useEffect(() => {
    if (execution.status === "idle") return;
    chrome.setBottomPanel("results");
    chrome.setBottomPanelOpen(true);
  }, [chrome, execution.status]);

  React.useEffect(() => {
    let stage: IDELogEntry["stage"] | null = null;
    if (execution.status === "running") {
      const detail = execution.detail?.toLowerCase() ?? "";
      stage = detail.includes("grading") ? "grading" : detail.includes("running") ? "running" : "queued";
    } else if (isVerdict(execution.status)) stage = "graded";
    if (!stage || lastLogStage.current === stage) return;
    lastLogStage.current = stage;
    setLogs((current) => [...current, { stage, at: new Date().toLocaleTimeString() }]);
  }, [execution.detail, execution.status]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      const target = event.target as HTMLElement | null;
      const inEditor = Boolean(target?.closest(".monaco-editor"));
      if (inEditor && modifier && (event.key === "Enter" || event.key.toLowerCase() === "s" || event.key.toLowerCase() === "k")) return;
      if (modifier && event.key === "Enter" && !event.shiftKey) { event.preventDefault(); actionRef.current.run(); }
      else if (modifier && event.key === "Enter" && event.shiftKey) { event.preventDefault(); actionRef.current.submit(); }
      else if (modifier && event.key.toLowerCase() === "s") { event.preventDefault(); actionRef.current.save(); }
      else if (modifier && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); }
      else if (modifier && event.key === "/") { event.preventDefault(); togglePanel(); }
      else if (modifier && event.key.toLowerCase() === "b") { event.preventDefault(); setStatementVisible((current) => !current); }
      else if (modifier && event.key.toLowerCase() === "f" && !inEditor) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePanel]);

  const actions: CommandPaletteAction[] = [
    { id: "run", label: "Run solution", shortcut: "⌘Enter", icon: COMMAND_ICONS.run, onSelect: handleRun },
    { id: "submit", label: "Submit solution", shortcut: "⌘⇧Enter", icon: COMMAND_ICONS.submit, onSelect: () => primaryAction?.onClick() },
    { id: "save", label: "Save editor", shortcut: "⌘S", icon: COMMAND_ICONS.settings, onSelect: flushSave },
    { id: "reset", label: "Reset solution", icon: COMMAND_ICONS.reset, onSelect: handleReset },
    { id: "wrap", label: "Toggle word wrap", icon: COMMAND_ICONS.settings, onSelect: () => updateSettings({ wordWrap: !settings.wordWrap }) },
    { id: "statement", label: "Toggle statement pane", shortcut: "⌘B", icon: COMMAND_ICONS.panel, onSelect: () => setStatementVisible((current) => !current) },
    { id: "panel", label: "Toggle bottom panel", shortcut: "⌘/", icon: COMMAND_ICONS.panel, onSelect: togglePanel },
  ];

  const isFrontend = initialFiles.some((file) => file.language === "html" || file.language === "css" || file.language === "javascript");
  return {
    workspaceRef, chrome, filesState, active, settings, updateSettings, settingsOpen, setSettingsOpen, paletteOpen, setPaletteOpen,
    split, setSplit, dragging, setDragging, localDirty, runBusy, mobileView, setMobileView, statementVisible, setStatementVisible,
    logs, cursor, effectiveExecution: execution.status !== "idle" ? execution : runExecution, isFrontend,
    style: { "--statement-width": `${split}%` } as React.CSSProperties, actions, handleRun, handleReset, handleMount, handleChange,
    handleUndo, handleRedo, handleFormat, handleCursorChange, layoutEditor, colorizeCode, flushSave, toggleFullscreen, togglePanel,
    changeLanguage: (language: IDELanguage | "plaintext") => { if (active && language !== "plaintext") filesState.setLanguage(active.path, language); },
    changeTheme: (theme: IDETheme) => chrome.setTheme(theme),
    stepFont: (delta: number) => updateSettings({ fontSize: settings.fontSize + delta }),
  };
}
