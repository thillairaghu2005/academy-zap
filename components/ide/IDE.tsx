"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { PanelBottom, TerminalSquare } from "lucide-react";
import type { Monaco, OnMount } from "@monaco-editor/react";

import type { IDEFile, IDELanguage, IDEPanel, IDEProblem, IDETheme } from "@/types/ide";
import { getMonacoThemeName } from "@/lib/monaco";
import { useEditor } from "@/hooks/useEditor";
import { useFiles } from "@/hooks/useFiles";
import { useIDE } from "@/hooks/useIDE";
import { ActivityBar } from "./ActivityBar";
import { Console } from "./Console";
import { EmptyState } from "./EmptyState";
import { Output } from "./Output";
import { Preview } from "./Preview";
import { SideBar } from "./SideBar";
import { SandboxFrame } from "./SandboxFrame";
import { StatusBar } from "./StatusBar";
import { TabBar } from "./TabBar";
import { Toolbar } from "./Toolbar";
import styles from "./ide.module.css";

const MonacoEditor = dynamic(() => import("./Editor").then((module) => module.IDEEditor), { ssr: false, loading: () => <div className={styles.editorLoading}>Loading Monaco Editor…</div> });

const CHROME_THEMES: Record<IDETheme, Record<string, string>> = {
  "vs-dark": { bg: "#181a1f", fg: "#d4d4d4", muted: "#8b93a1", border: "#2a2f38", panel: "#20242b", active: "#2d333d", accent: "#4daafc", soft: "#1d3d56", success: "#4ec9b0" },
  "vs-light": { bg: "#f6f8fa", fg: "#1f2937", muted: "#687386", border: "#d9dee7", panel: "#eef1f5", active: "#e3e9f1", accent: "#0969da", soft: "#dcecff", success: "#1a7f37" },
  "github-dark": { bg: "#0d1117", fg: "#e6edf3", muted: "#8b949e", border: "#30363d", panel: "#161b22", active: "#21262d", accent: "#58a6ff", soft: "#1c3452", success: "#3fb950" },
  "github-light": { bg: "#ffffff", fg: "#24292f", muted: "#57606a", border: "#d0d7de", panel: "#f6f8fa", active: "#ddf4ff", accent: "#0969da", soft: "#ddf4ff", success: "#1a7f37" },
  "one-dark-pro": { bg: "#21252b", fg: "#abb2bf", muted: "#7f848e", border: "#181a1f", panel: "#282c34", active: "#3e4451", accent: "#61afef", soft: "#263849", success: "#98c379" },
  dracula: { bg: "#21222c", fg: "#f8f8f2", muted: "#9aa0b5", border: "#44475a", panel: "#282a36", active: "#44475a", accent: "#bd93f9", soft: "#3b3153", success: "#50fa7b" },
  monokai: { bg: "#22231f", fg: "#f8f8f2", muted: "#9b998d", border: "#49483e", panel: "#272822", active: "#49483e", accent: "#a6e22e", soft: "#3d4b28", success: "#a6e22e" },
  "solarized-dark": { bg: "#002b36", fg: "#839496", muted: "#657b83", border: "#073642", panel: "#073642", active: "#094352", accent: "#2aa198", soft: "#063d42", success: "#859900" },
  "solarized-light": { bg: "#fdf6e3", fg: "#657b83", muted: "#839496", border: "#eee8d5", panel: "#eee8d5", active: "#e5dfc9", accent: "#268bd2", soft: "#d9eaf5", success: "#859900" },
  nord: { bg: "#2e3440", fg: "#d8dee9", muted: "#7b88a1", border: "#434c5e", panel: "#3b4252", active: "#434c5e", accent: "#88c0d0", soft: "#304854", success: "#a3be8c" },
  "material-dark": { bg: "#263238", fg: "#eeffff", muted: "#8297a2", border: "#37474f", panel: "#263238", active: "#37474f", accent: "#82aaff", soft: "#2d4554", success: "#c3e88d" },
  "material-light": { bg: "#fafafa", fg: "#37474f", muted: "#78909c", border: "#e0e0e0", panel: "#f1f3f4", active: "#e3f2fd", accent: "#2979ff", soft: "#d9eafc", success: "#91b859" },
};

const PANEL_LABELS: Array<{ value: IDEPanel; label: string }> = [
  { value: "console", label: "Console" }, { value: "output", label: "Output" }, { value: "problems", label: "Problems" }, { value: "terminal", label: "Terminal" },
];

export interface IDEProps {
  initialFiles: IDEFile[];
  storageKey?: string;
  onActiveContentChange?: (content: string, file: IDEFile | undefined) => void;
  resetKey?: number;
  resetContent?: string;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  onReset?: () => void;
}

export function IDE({ initialFiles, storageKey = "ide:files", onActiveContentChange, resetKey = 0, resetContent = "", primaryAction, onReset }: IDEProps) {
  const chrome = useIDE();
  const filesState = useFiles(initialFiles, storageKey);
  const { settings, updateSettings } = useEditor();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const monacoRef = React.useRef<Monaco | null>(null);
  const resizeRef = React.useRef<"sidebar" | "bottom" | null>(null);
  const active = filesState.active;
  const palette = CHROME_THEMES[chrome.theme];

  React.useEffect(() => {
    onActiveContentChange?.(active?.content ?? "", active);
  }, [active, onActiveContentChange]);

  React.useEffect(() => {
    if (resetKey > 0 && active) filesState.resetContent(active.path, resetContent);
    // resetKey is an explicit parent command, so the content is intentionally read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const startResize = (kind: "sidebar" | "bottom", event: React.PointerEvent) => {
    event.preventDefault();
    resizeRef.current = kind;
    const start = event.clientX;
    const startY = event.clientY;
    const startWidth = chrome.sidebarWidth;
    const startHeight = chrome.bottomPanelHeight;
    const move = (nextEvent: PointerEvent) => {
      if (resizeRef.current === "sidebar") chrome.setSidebarWidth(startWidth + nextEvent.clientX - start);
      if (resizeRef.current === "bottom") chrome.setBottomPanelHeight(startHeight - (nextEvent.clientY - startY));
    };
    const end = () => { resizeRef.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const handleThemeChange = (nextTheme: IDETheme) => {
    chrome.setTheme(nextTheme);
    if (monacoRef.current) monacoRef.current.editor.setTheme(getMonacoThemeName(nextTheme));
  };

  const handleRun = () => {
    if (active?.language === "javascript" || active?.language === "typescript") chrome.runJavaScript(active.content);
  };

  const handleLanguageChange = (language: IDELanguage) => {
    if (active) filesState.setLanguage(active.path, language);
  };

  const handleContentChange = (content: string) => {
    if (!active) return;
    filesState.updateContent(active.path, content);
    onActiveContentChange?.(content, { ...active, content, dirty: true });
  };

  const activeProblems: IDEProblem[] = [];
  const style = {
    "--ide-bg": palette.bg,
    "--ide-fg": palette.fg,
    "--ide-muted": palette.muted,
    "--ide-border": palette.border,
    "--ide-panel": palette.panel,
    "--ide-active": palette.active,
    "--ide-accent": palette.accent,
    "--ide-accent-soft": palette.soft,
    "--ide-success": palette.success,
  } as React.CSSProperties;

  return (
    <div className={`ide-workspace ${styles.workspace}`} data-ide-root style={style}>
      <Toolbar language={active?.language ?? "plaintext"} theme={chrome.theme} onLanguageChange={handleLanguageChange} onThemeChange={handleThemeChange} onRun={handleRun} onPreview={() => chrome.setPreviewOpen(!chrome.previewOpen)} onReset={() => { if (active) filesState.resetContent(active.path, resetContent); onReset?.(); }} onToggleSettings={() => setSettingsOpen((current) => !current)} onSave={() => { if (active) filesState.resetContent(active.path, active.content); }} canRun={active?.language === "javascript" || active?.language === "typescript"} previewOpen={chrome.previewOpen} primaryAction={primaryAction} />
      <div className={styles.ideBody}>
        <ActivityBar explorerOpen={chrome.sidebarOpen} onExplorerToggle={() => chrome.setSidebarOpen(!chrome.sidebarOpen)} onSettings={() => setSettingsOpen((current) => !current)} />
        {chrome.sidebarOpen ? <><div className={styles.sideBarShell} style={{ width: chrome.sidebarWidth }}><SideBar files={filesState.files} activeFile={filesState.activeFile} onOpen={filesState.openFile} onAddFile={(path) => filesState.addFile(path)} onAddFolder={(path) => filesState.addFolder(path)} onRename={filesState.renameFile} onDelete={filesState.deleteFile} onDuplicate={filesState.duplicateFile} onMove={filesState.moveFile} /></div><div className={styles.resizeHandle} onPointerDown={(event) => startResize("sidebar", event)} role="separator" aria-label="Resize explorer" /></> : null}
        <main className={styles.editorShell}>
          <TabBar files={filesState.files} openFiles={filesState.openFiles} activeFile={filesState.activeFile} onOpen={filesState.openFile} onClose={filesState.closeFile} onMove={filesState.moveFile} />
          <div className={styles.editorAndPreview}>
            <section className={styles.editorSurface} aria-label="Editor">
              {active ? <MonacoEditor file={active} theme={chrome.theme} settings={settings} onChange={handleContentChange} onMount={((editor, monaco) => { void editor; monacoRef.current = monaco; monaco.editor.setTheme(getMonacoThemeName(chrome.theme)); }) satisfies OnMount} /> : <EmptyState />}
              {settingsOpen ? <div className={styles.settingsPopover}><strong>Editor settings</strong><label><input type="checkbox" checked={settings.wordWrap} onChange={(event) => updateSettings({ wordWrap: event.target.checked })} /> Word wrap</label><label><input type="checkbox" checked={settings.minimap} onChange={(event) => updateSettings({ minimap: event.target.checked })} /> Minimap</label><label>Font size <input type="range" min="11" max="18" value={settings.fontSize} onChange={(event) => updateSettings({ fontSize: Number(event.target.value) })} /></label></div> : null}
            </section>
            {chrome.previewOpen ? <Preview files={filesState.files} onClose={() => chrome.setPreviewOpen(false)} /> : null}
          </div>
          {chrome.bottomPanelOpen ? <><div className={styles.bottomResizeHandle} onPointerDown={(event) => startResize("bottom", event)} role="separator" aria-label="Resize bottom panel" /><section className={styles.bottomPanel} style={{ height: chrome.bottomPanelHeight }}><div className={styles.panelTabs} role="tablist">{PANEL_LABELS.map((panel) => <button key={panel.value} className={`${styles.panelTab} ${chrome.bottomPanel === panel.value ? styles.panelTabActive : ""}`} onClick={() => chrome.setBottomPanel(panel.value)} role="tab" aria-selected={chrome.bottomPanel === panel.value}>{panel.label}{panel.value === "problems" && activeProblems.length > 0 ? <span className={styles.panelCount}>{activeProblems.length}</span> : null}</button>)}<div className={styles.panelTabSpacer} /><button className={styles.panelIconButton} onClick={() => chrome.setBottomPanelOpen(false)} aria-label="Hide bottom panel"><PanelBottom size={15} /></button><button className={styles.panelIconButton} onClick={chrome.clearOutput} aria-label="Clear output"><TerminalSquare size={15} /></button></div>{chrome.bottomPanel === "console" ? <Console entries={chrome.output} onClear={chrome.clearOutput} lastRunAt={chrome.lastRunAt} /> : chrome.bottomPanel === "output" ? <Output problems={[]} /> : chrome.bottomPanel === "problems" ? <Output problems={activeProblems} /> : <div className={styles.terminalPlaceholder}><TerminalSquare size={18} /><span>Terminal is a placeholder in this frontend-only workspace.</span><code>workspace $</code></div>}</section></> : <button className={styles.showPanelButton} onClick={() => chrome.setBottomPanelOpen(true)}><PanelBottom size={14} /> Show panel</button>}
          <StatusBar file={active} lineCount={(active?.content ?? "").split("\n").length} />
        </main>
      </div>
      <SandboxFrame onReady={chrome.setFrame} />
    </div>
  );
}
