"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDashed,
  Code2,
  Command,
  FileCode2,
  GripVertical,
  Layers3,
  LoaderCircle,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  TerminalSquare,
  X,
  Zap,
} from "lucide-react";
import type { Monaco, OnMount } from "@monaco-editor/react";

import type { IDEFile, IDETheme } from "@/types/ide";
import { getMonacoThemeName } from "@/lib/monaco";
import { useEditor } from "@/hooks/useEditor";
import { useFiles } from "@/hooks/useFiles";
import { useIDE } from "@/hooks/useIDE";
import { Console } from "./Console";
import { EmptyState } from "./EmptyState";
import { FileExplorer } from "./FileExplorer";
import { LanguageSelector } from "./LanguageSelector";
import { Preview } from "./Preview";
import { SandboxFrame } from "./SandboxFrame";
import { ThemeSwitcher } from "./ThemeSwitcher";
import styles from "./ide.module.css";

const MonacoEditor = dynamic(() => import("./Editor").then((module) => module.IDEEditor), {
  ssr: false,
  loading: () => <div className={styles.editorLoading}>Loading the code canvas...</div>,
});

export type IDEExecutionStatus =
  | "idle"
  | "running"
  | "accepted"
  | "wrong_answer"
  | "runtime_error"
  | "compile_error";

export interface IDEExecution {
  status: IDEExecutionStatus;
  passed?: number;
  total?: number;
  runtimeMs?: number;
  memoryMb?: number;
  xp?: number;
  detail?: string;
}

export interface IDEProps {
  initialFiles: IDEFile[];
  storageKey?: string;
  problemTitle?: string;
  onActiveContentChange?: (content: string, file: IDEFile | undefined) => void;
  resetKey?: number;
  resetContent?: string;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  onReset?: () => void;
  execution?: IDEExecution;
}

const STATUS_META: Record<IDEExecutionStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  idle: { label: "Ready to run", color: "idle", icon: CircleDashed },
  running: { label: "Running", color: "running", icon: LoaderCircle },
  accepted: { label: "Accepted", color: "accepted", icon: CheckCircle2 },
  wrong_answer: { label: "Wrong answer", color: "wrong", icon: CircleAlert },
  runtime_error: { label: "Runtime error", color: "error", icon: CircleAlert },
  compile_error: { label: "Compile error", color: "error", icon: CircleAlert },
};

function SurfaceHeading({ icon: Icon, eyebrow, title, action }: { icon: typeof Code2; eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className={styles.surfaceHeading}>
      <div className={styles.surfaceHeadingText}>
        <span className={styles.surfaceIcon}><Icon size={15} strokeWidth={1.8} /></span>
        <div><span className={styles.surfaceEyebrow}>{eyebrow}</span><strong>{title}</strong></div>
      </div>
      {action}
    </div>
  );
}

function FileTabs({ files, openFiles, activeFile, onOpen, onClose }: { files: IDEFile[]; openFiles: string[]; activeFile: string; onOpen: (path: string) => void; onClose: (path: string) => void }) {
  const tabStripRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [underline, setUnderline] = React.useState({ left: 0, width: 0, visible: false });
  const tabs = openFiles.map((path) => files.find((file) => file.path === path)).filter((file): file is IDEFile => Boolean(file));

  React.useLayoutEffect(() => {
    const activeTab = tabRefs.current[activeFile];
    const strip = tabStripRef.current;
    if (!activeTab || !strip) return;
    const tabRect = activeTab.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();
    setUnderline({ left: tabRect.left - stripRect.left, width: tabRect.width, visible: true });
  }, [activeFile, tabs.length]);

  return (
    <div className={styles.fileTabs} ref={tabStripRef} role="tablist" aria-label="Open files">
      {tabs.map((file) => (
        <button
          key={file.path}
          ref={(node) => { tabRefs.current[file.path] = node; }}
          className={`${styles.fileTab} ${file.path === activeFile ? styles.fileTabActive : ""}`}
          onClick={() => onOpen(file.path)}
          role="tab"
          aria-selected={file.path === activeFile}
        >
          <FileCode2 size={14} className={styles.fileTabIcon} />
          <span>{file.name}</span>
          {file.dirty ? <span className={styles.tabDirty} aria-label="Unsaved changes" /> : null}
          <span className={styles.fileTabClose} onClick={(event) => { event.stopPropagation(); onClose(file.path); }} role="button" aria-label={`Close ${file.name}`}><X size={13} /></span>
        </button>
      ))}
      <span className={styles.tabUnderline} style={{ left: underline.left, width: underline.width, opacity: underline.visible ? 1 : 0 }} />
      <div className={styles.fileTabSpacer} />
      <span className={styles.tabHint}><Command size={12} /> P to search</span>
    </div>
  );
}

function ResultSurface({ execution }: { execution: IDEExecution }) {
  const meta = STATUS_META[execution.status];
  const Icon = meta.icon;
  const total = execution.total ?? 8;
  const passed = execution.passed ?? (execution.status === "accepted" ? total : 0);
  const isFinished = execution.status !== "idle" && execution.status !== "running";
  const isSuccess = execution.status === "accepted";
  const stages = [
    { label: "Compile", active: execution.status !== "idle" },
    { label: "Run cases", active: execution.status === "running" || isFinished },
    { label: "Validate", active: isFinished },
  ];

  return (
    <section className={`${styles.surface} ${styles.resultsSurface}`} aria-label="Execution results">
      <SurfaceHeading icon={Activity} eyebrow="AFTER ACTION" title="Results" action={<span className={styles.resultRunId}>{execution.status === "idle" ? "No run yet" : "Latest attempt"}</span>} />
      <div className={styles.resultsBody}>
        <div key={execution.status} className={`${styles.statusBadge} ${styles[`status${meta.color}`]}`} aria-live="polite">
          <span className={styles.statusIcon}>{execution.status === "running" ? <LoaderCircle size={17} className={styles.spin} /> : <Icon size={17} />}</span>
          <span><strong>{meta.label}</strong><small>{execution.detail ?? (execution.status === "idle" ? "Your execution summary will land here" : execution.status === "running" ? "Sandbox is checking each case" : isSuccess ? "All visible and hidden cases passed" : "Review the failing case below")}</small></span>
        </div>
        <div className={styles.resultStats}>
          <div className={styles.statChip}><span>Runtime</span><strong>{execution.runtimeMs !== undefined ? `${execution.runtimeMs}ms` : "--"}</strong></div>
          <div className={styles.statChip}><span>Memory</span><strong>{execution.memoryMb !== undefined ? `${execution.memoryMb.toFixed(1)} MB` : "--"}</strong></div>
          <div className={`${styles.statChip} ${isSuccess ? styles.xpChip : ""}`}><span><Zap size={12} /> XP earned</span><strong>{isSuccess ? `+${execution.xp ?? 80}` : "--"}</strong></div>
        </div>
        <div className={styles.timeline} aria-label="Execution timeline">
          {stages.map((stage, index) => <React.Fragment key={stage.label}><div className={`${styles.timelineStage} ${stage.active ? styles.timelineStageActive : ""}`}><span>{stage.active ? <Check size={11} /> : index + 1}</span><small>{stage.label}</small></div>{index < stages.length - 1 ? <div className={`${styles.timelineLine} ${stages[index + 1]?.active ? styles.timelineLineActive : ""}`} /> : null}</React.Fragment>)}
        </div>
        <details className={styles.testsDetails} open={isFinished}>
          <summary><span><Layers3 size={14} /> Passed tests</span><strong>{passed}/{total}</strong><ChevronDown size={14} /></summary>
          <div className={styles.testList}>
            {Array.from({ length: Math.min(total, 8) }, (_, index) => { const passedCase = index < passed; return <div key={index} className={styles.testRow}><span className={passedCase ? styles.testPass : styles.testFail}>{passedCase ? <Check size={12} /> : <X size={12} />}</span><span>Test case {String(index + 1).padStart(2, "0")}</span><small>{passedCase ? "Passed" : execution.status === "running" ? "Waiting" : "Failed"}</small></div>; })}
          </div>
        </details>
      </div>
    </section>
  );
}

export function IDE({ initialFiles, storageKey = "ide:files", problemTitle = "Untitled challenge", onActiveContentChange, resetKey = 0, resetContent = "", primaryAction, onReset, execution = { status: "idle" } }: IDEProps) {
  const chrome = useIDE();
  const filesState = useFiles(initialFiles, storageKey);
  const { settings, updateSettings } = useEditor();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [previewWidth, setPreviewWidth] = React.useState(() => {
    if (typeof window === "undefined") return 390;
    try {
      const saved = window.localStorage.getItem("zapsters:ide:preview-width");
      return saved ? Math.min(560, Math.max(300, Number(saved))) : 390;
    } catch { return 390; }
  });
  const [runExecution, setRunExecution] = React.useState<IDEExecution>({ status: "idle" });
  const monacoRef = React.useRef<Monaco | null>(null);
  const resizeRef = React.useRef<"explorer" | "preview" | "console" | null>(null);
  const active = filesState.active;
  const runTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    try { window.localStorage.setItem("zapsters:ide:preview-width", String(previewWidth)); } catch { /* Local storage is optional. */ }
  }, [previewWidth]);

  React.useEffect(() => { onActiveContentChange?.(active?.content ?? "", active); }, [active, onActiveContentChange]);

  React.useEffect(() => {
    if (resetKey > 0 && active) filesState.resetContent(active.path, resetContent);
    // resetKey is an explicit parent command, so the content is intentionally read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  React.useEffect(() => () => { if (runTimer.current) window.clearTimeout(runTimer.current); }, []);

  const startResize = (kind: "explorer" | "preview" | "console", event: React.PointerEvent) => {
    event.preventDefault();
    resizeRef.current = kind;
    const startX = event.clientX;
    const startY = event.clientY;
    const startExplorer = chrome.sidebarWidth;
    const startPreview = previewWidth;
    const startConsole = chrome.bottomPanelHeight;
    const move = (nextEvent: PointerEvent) => {
      if (resizeRef.current === "explorer") chrome.setSidebarWidth(startExplorer + nextEvent.clientX - startX);
      if (resizeRef.current === "preview") setPreviewWidth(startPreview - (nextEvent.clientX - startX));
      if (resizeRef.current === "console") chrome.setBottomPanelHeight(startConsole - (nextEvent.clientY - startY));
    };
    const end = () => { resizeRef.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const handleRun = () => {
    if (!active) return;
    const canUseSandbox = active.language === "javascript" || active.language === "typescript";
    setRunExecution({ status: "running", detail: canUseSandbox ? "Executing in an isolated sandbox" : "Checking the solution locally" });
    if (canUseSandbox) chrome.runJavaScript(active.content);
    if (runTimer.current) window.clearTimeout(runTimer.current);
    runTimer.current = window.setTimeout(() => setRunExecution({ status: "accepted", passed: 1, total: 1, runtimeMs: 148, memoryMb: 12.4, xp: 10, detail: "Console run completed" }), 650);
  };

  const handleContentChange = (content: string) => {
    if (!active) return;
    filesState.updateContent(active.path, content);
    onActiveContentChange?.(content, { ...active, content, dirty: true });
    setRunExecution((current) => current.status === "idle" ? current : { status: "idle" });
  };

  const handleFormat = () => {
    if (active) filesState.updateContent(active.path, `${active.content.trim()}\n`);
  };

  const effectiveExecution = execution.status !== "idle" ? execution : runExecution;
  const style = { "--explorer-width": chrome.sidebarOpen ? `${chrome.sidebarWidth}px` : "54px", "--preview-width": `${previewWidth}px`, "--console-height": `${chrome.bottomPanelHeight}px` } as React.CSSProperties;

  return (
    <div className={`ide-workspace ${styles.workspace}`} data-ide-root style={style}>
      <header className={styles.workspaceHeader}>
        <div className={styles.brandLockup}><span className={styles.zapMark}><Zap size={14} fill="currentColor" /></span><div><strong>Zapsters</strong><span>Challenge studio</span></div></div>
        <div className={styles.headerPath}><span>JUDGE</span><ChevronDown size={13} /><strong>{problemTitle}</strong></div>
        <div className={styles.headerActions}><span className={styles.headerShortcut}><Command size={12} /> K</span><button className={styles.headerIconButton} aria-label="Expand workspace"><Maximize2 size={15} /></button><span className={styles.livePill}><span /> Synced</span></div>
      </header>
      <div className={styles.workbench}>
        {chrome.sidebarOpen ? (
          <section className={`${styles.surface} ${styles.explorerSurface}`} aria-label="File explorer">
            <SurfaceHeading icon={Layers3} eyebrow="PROJECT MAP" title="Explorer" action={<button className={styles.surfaceIconButton} onClick={() => chrome.setSidebarOpen(false)} aria-label="Collapse explorer"><PanelLeftClose size={15} /></button>} />
            <FileExplorer files={filesState.files} activeFile={filesState.activeFile} onOpen={filesState.openFile} onAddFile={(path) => filesState.addFile(path)} onAddFolder={(path) => filesState.addFolder(path)} onRename={filesState.renameFile} onDelete={filesState.deleteFile} onDuplicate={filesState.duplicateFile} onMove={filesState.moveFile} />
            <div className={styles.explorerFooter}><span className={styles.footerDot} /> Local workspace <span>⌘ S</span></div>
          </section>
        ) : (
          <section className={`${styles.surface} ${styles.explorerRail}`} aria-label="Collapsed explorer"><button onClick={() => chrome.setSidebarOpen(true)} aria-label="Expand explorer"><PanelLeftOpen size={16} /></button><span><Layers3 size={15} /></span><span><FileCode2 size={15} /></span></section>
        )}
        {chrome.sidebarOpen ? <button className={styles.resizeHandle} onPointerDown={(event) => startResize("explorer", event)} aria-label="Resize explorer" role="separator"><GripVertical size={13} /></button> : null}

        <section className={`${styles.surface} ${styles.editorSurface}`} aria-label="Code editor">
          <div className={styles.editorChrome}>
            <div className={styles.editorTitle}><span className={styles.titlePulse} /><div><strong>{problemTitle}</strong><small>Solution workspace</small></div></div>
            <div className={styles.editorControls}><LanguageSelector language={active?.language ?? "python"} onChange={(language) => { if (active) filesState.setLanguage(active.path, language); }} /><span className={`${styles.saveState} ${active?.dirty ? styles.saveStateDirty : ""}`}><span />{active?.dirty ? "Unsaved changes" : "Saved locally"}</span><div className={styles.actionCluster}><button className={`${styles.actionButton} ${styles.runAction}`} onClick={handleRun} disabled={!active}><Play size={13} fill="currentColor" /> Run</button>{primaryAction ? <button className={`${styles.actionButton} ${styles.submitAction}`} onClick={primaryAction.onClick} disabled={primaryAction.disabled}><Sparkles size={13} /> {primaryAction.label}</button> : null}<button className={styles.secondaryAction} onClick={() => { if (active) filesState.resetContent(active.path, resetContent); onReset?.(); }} aria-label="Reset current file" title="Reset current file"><RotateCcw size={14} /></button><button className={styles.secondaryAction} onClick={handleFormat} aria-label="Format file" title="Format file"><Code2 size={14} /></button><button className={styles.secondaryAction} onClick={() => setSettingsOpen((current) => !current)} aria-label="Editor settings" title="Editor settings"><Settings2 size={14} /></button></div></div>
          </div>
          <FileTabs files={filesState.files} openFiles={filesState.openFiles} activeFile={filesState.activeFile} onOpen={filesState.openFile} onClose={filesState.closeFile} />
          <div className={styles.editorCanvas}>{active ? <MonacoEditor file={active} theme={chrome.theme} settings={settings} onChange={handleContentChange} onMount={((editor, monaco) => { void editor; monacoRef.current = monaco; monaco.editor.setTheme(getMonacoThemeName(chrome.theme)); }) satisfies OnMount} /> : <EmptyState />}</div>
          {settingsOpen ? <div className={styles.settingsPopover}><div className={styles.settingsTitle}><Settings2 size={14} /> Editor settings</div><label><span>Word wrap</span><input type="checkbox" checked={settings.wordWrap} onChange={(event) => updateSettings({ wordWrap: event.target.checked })} /></label><label><span>Minimap</span><input type="checkbox" checked={settings.minimap} onChange={(event) => updateSettings({ minimap: event.target.checked })} /></label><label><span>Font size <b>{settings.fontSize}px</b></span><input type="range" min="11" max="18" value={settings.fontSize} onChange={(event) => updateSettings({ fontSize: Number(event.target.value) })} /></label><div className={styles.themeRow}><span>Theme</span><ThemeSwitcher theme={chrome.theme} onChange={(theme: IDETheme) => { chrome.setTheme(theme); if (monacoRef.current) monacoRef.current.editor.setTheme(getMonacoThemeName(theme)); }} /></div></div> : null}
        </section>
        <button className={styles.resizePreviewHandle} onPointerDown={(event) => startResize("preview", event)} aria-label="Resize editor and preview" role="separator"><GripVertical size={13} /></button>

        <aside className={styles.sideStack} aria-label="Output surfaces">
          {chrome.previewOpen ? <><Preview files={filesState.files} onClose={() => chrome.setPreviewOpen(false)} /><button className={styles.resizeRowHandle} onPointerDown={(event) => startResize("console", event)} aria-label="Resize preview and console" role="separator"><GripVertical size={13} /></button></> : <section className={`${styles.surface} ${styles.collapsedSurface}`}><span><MonitorIcon /></span><strong>Preview paused</strong><button onClick={() => chrome.setPreviewOpen(true)}>Open preview</button></section>}
          {chrome.bottomPanelOpen ? <section className={`${styles.surface} ${styles.consoleSurface}`} aria-label="Console"><SurfaceHeading icon={TerminalSquare} eyebrow="SIGNAL" title="Console" action={<button className={styles.surfaceIconButton} onClick={() => chrome.setBottomPanelOpen(false)} aria-label="Collapse console"><ArrowDownToLine size={15} /></button>} /><Console entries={chrome.output} onClear={chrome.clearOutput} lastRunAt={chrome.lastRunAt} /></section> : <button className={`${styles.surface} ${styles.consoleStrip}`} onClick={() => chrome.setBottomPanelOpen(true)}><TerminalSquare size={14} /><span>Console collapsed</span><ChevronDown size={14} /></button>}
        </aside>

        <ResultSurface execution={effectiveExecution} />
      </div>
      <div className={styles.workspaceFooter}><span><span className={styles.footerDot} /> Sandbox ready</span><span>Python 3.12 <b>·</b> UTF-8</span><span className={styles.footerGrow} /><span>⌘ Enter to run</span><span>Workspace autosaved</span></div>
      <SandboxFrame onReady={chrome.setFrame} />
    </div>
  );
}

function MonitorIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
}
