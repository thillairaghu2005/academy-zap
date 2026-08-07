"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import type { JudgeResult, Problem } from "@/lib/contracts/judge";
import type { IDEFile, IDETheme } from "@/types/ide";
import { BottomPanel } from "./panel/BottomPanel";
import { CommandPalette } from "./shell/CommandPalette";
import { SplitDivider } from "./shell/SplitDivider";
import { StatusBar } from "./shell/StatusBar";
import { Toolbar } from "./shell/Toolbar";
import { SandboxFrame } from "./SandboxFrame";
import { useIDEWorkspace } from "./useIDEWorkspace";
import styles from "./ide.module.css";

const MonacoEditor = dynamic(() => import("./editor/EditorPane").then((module) => module.EditorPane), {
  ssr: false,
  loading: () => <div className={styles.editorLoading}>Loading code canvas...</div>,
});

const StatementPane = dynamic(() => import("./statement/StatementPane").then((module) => module.StatementPane), {
  ssr: false,
  loading: () => <div className={styles.statementLoading}>Loading problem statement...</div>,
});

export type IDEExecutionStatus =
  | "idle"
  | "running"
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "runtime_error"
  | "compile_error";

export interface IDEExecution {
  status: IDEExecutionStatus;
  passed?: number;
  total?: number;
  runtimeMs?: number;
  memoryMb?: number;
  xp?: number;
  xpCompletion?: number;
  xpMastery?: number;
  percentile?: number;
  detail?: string;
  result?: JudgeResult;
}

export interface IDEProps {
  initialFiles: IDEFile[];
  storageKey?: string;
  problemTitle?: string;
  problem?: Problem;
  onActiveContentChange?: (content: string, file: IDEFile | undefined) => void;
  resetKey?: number;
  resetContent?: string;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  onReset?: () => void;
  execution?: IDEExecution;
}

export function IDE(props: IDEProps) {
  const { problemTitle = "Untitled challenge", problem, primaryAction } = props;
  const workspace = useIDEWorkspace(props);
  const { workspaceRef, chrome, filesState, active, settings, updateSettings, settingsOpen, setSettingsOpen, paletteOpen, setPaletteOpen, split, setSplit, dragging, setDragging, localDirty, runBusy, mobileView, setMobileView, statementVisible, logs, cursor, effectiveExecution, isFrontend, style, actions, handleRun, handleMount, handleChange, handleCursorChange, handleUndo, handleRedo, handleFormat, layoutEditor, colorizeCode, toggleFullscreen, togglePanel, changeLanguage, changeTheme, stepFont } = workspace;

  return (
    <div ref={workspaceRef} className={`ide-workspace ${styles.workspace} ${dragging ? styles.workspaceDragging : ""}`} data-ide-root data-running={runBusy || effectiveExecution.status === "running" ? "true" : undefined} data-frontend={isFrontend ? "true" : undefined} style={style}>
      <Toolbar title={problem?.title ?? problemTitle} difficulty={problem?.difficulty} topics={problem?.topics} language={active?.language ?? "python"} theme={chrome.theme} settings={settings} settingsOpen={settingsOpen} canRun={Boolean(active)} runBusy={runBusy} primaryAction={primaryAction} onLanguageChange={changeLanguage} onThemeChange={(theme: IDETheme) => changeTheme(theme)} onSettingsToggle={() => setSettingsOpen((current) => !current)} onSettingsChange={updateSettings} onRun={handleRun} onFontStep={stepFont} onOpenPalette={() => setPaletteOpen(true)} />
      {problem ? <div className={styles.mobileTabs} role="tablist" aria-label="Mobile IDE views"><button type="button" role="tab" aria-selected={mobileView === "problem"} onClick={() => setMobileView("problem")}>Problem</button><button type="button" role="tab" aria-selected={mobileView === "code"} onClick={() => setMobileView("code")}>Code</button><button type="button" role="tab" aria-selected={mobileView === "results"} onClick={() => { setMobileView("results"); chrome.setBottomPanel("results"); }}>Results</button></div> : null}
      <main className={`${styles.splitLayout} ${!problem || !statementVisible ? styles.statementHidden : ""}`} data-dragging={dragging ? "true" : undefined}>
        {problem ? <div className={`${styles.statementSlot} ${mobileView === "problem" ? styles.mobileVisible : ""}`}><StatementPane problem={problem} colorizeCode={colorizeCode} /></div> : null}
        <SplitDivider value={split} onChange={setSplit} onDragEnd={layoutEditor} onDraggingChange={setDragging} />
        <div className={`${styles.codeColumn} ${mobileView === "results" ? styles.codeResultsMode : ""}`}>
          <div className={`${styles.editorSlot} ${mobileView === "code" ? styles.mobileVisible : ""}`}>
            <MonacoEditor file={active} theme={chrome.theme} settings={settings} saved={!localDirty} execution={effectiveExecution} onChange={handleChange} onMount={handleMount} onCursorChange={handleCursorChange} onUndo={handleUndo} onRedo={handleRedo} onFormat={handleFormat} onToggleWordWrap={() => updateSettings({ wordWrap: !settings.wordWrap })} onFullscreen={toggleFullscreen} />
          </div>
          <BottomPanel execution={effectiveExecution} output={chrome.output} logs={logs} lastRunAt={chrome.lastRunAt} requestTab={chrome.bottomPanel} open={chrome.bottomPanelOpen} height={chrome.bottomPanelHeight} mobileResults={mobileView === "results"} onClearOutput={chrome.clearOutput} onToggle={togglePanel} onHeightChange={chrome.setBottomPanelHeight} files={filesState.files} isFrontend={isFrontend} />
        </div>
      </main>
      <StatusBar file={active} cursor={cursor} saved={!localDirty} execution={effectiveExecution} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} actions={actions} />
      {isFrontend ? <SandboxFrame onReady={chrome.setFrame} /> : null}
    </div>
  );
}
