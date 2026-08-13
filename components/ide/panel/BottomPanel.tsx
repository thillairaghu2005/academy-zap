"use client";

import * as React from "react";
import { formatLocalTime } from "@/lib/format";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eraser,
  FileWarning,
  Info,
  LockKeyhole,
  RotateCcw,
  TerminalSquare,
  Timer,
  X,
} from "lucide-react";

import type { JudgeResult, Verdict } from "@/lib/contracts/judge";
import type { IDEFile, IDEOutputEntry, IDEPanel } from "@/types/ide";
import type { IDEExecution } from "../IDE";
import { verdictLabel } from "@/components/judge/verdict-badge";
import { LivePreview } from "../preview/LivePreview";
import styles from "../ide.module.css";

type PanelTab = "console" | "output" | "testcases" | "results" | "logs" | "preview";

const BASE_TABS: Array<{ id: PanelTab; label: string }> = [
  { id: "console", label: "Console" },
  { id: "output", label: "Output" },
  { id: "testcases", label: "Testcases" },
  { id: "results", label: "Results" },
  { id: "logs", label: "Logs" },
];

const VERDICT_META: Record<Verdict, { label: string; className: string; icon: typeof Check }> = {
  accepted: { label: "Accepted", className: styles.verdictAccepted ?? "", icon: Check },
  wrong_answer: { label: "Wrong Answer", className: styles.verdictWrongAnswer ?? "", icon: X },
  time_limit_exceeded: { label: "Time Limit Exceeded", className: styles.verdictTimeLimit ?? "", icon: Timer },
  runtime_error: { label: "Runtime Error", className: styles.verdictRuntimeError ?? "", icon: AlertCircle },
  compile_error: { label: "Compile Error", className: styles.verdictCompileError ?? "", icon: FileWarning },
};

export interface IDELogEntry {
  id: string;
  stage: "queued" | "running" | "grading" | "graded";
  at: string;
}

interface BottomPanelProps {
  execution: IDEExecution;
  output: IDEOutputEntry[];
  logs: IDELogEntry[];
  lastRunAt: string | null;
  requestTab: IDEPanel;
  open: boolean;
  height: number;
  mobileResults: boolean;
  onClearOutput: () => void;
  onToggle: () => void;
  onHeightChange: (height: number) => void;
  files: IDEFile[];
  isFrontend: boolean;
}

function formatMemory(memoryKb: number): string {
  return `${(memoryKb / 1024).toFixed(1)} MB`;
}

function executionVerdict(execution: IDEExecution): Verdict | null {
  if (execution.result?.verdict) return execution.result.verdict;
  if (execution.status === "accepted" || execution.status === "wrong_answer" || execution.status === "time_limit_exceeded" || execution.status === "runtime_error" || execution.status === "compile_error") return execution.status;
  return null;
}

function PanelEmpty({ icon: Icon, title, detail }: { icon: typeof Info; title: string; detail: string }) {
  return <div className={styles.panelEmpty}><Icon size={18} aria-hidden="true" /><strong>{title}</strong><small>{detail}</small></div>;
}

function ConsoleTab({ entries, lastRunAt, onClear }: { entries: IDEOutputEntry[]; lastRunAt: string | null; onClear: () => void }) {
  return (
    <div className={styles.panelTabBody}>
      <div className={styles.panelToolbar}><span>{lastRunAt ? `Last run ${formatLocalTime(lastRunAt)}` : "Sandbox console"}</span><button type="button" onClick={onClear}><Eraser size={13} /> Clear</button></div>
      <div className={styles.consoleRows} aria-live="polite">
        {entries.length === 0 ? <PanelEmpty icon={TerminalSquare} title="Console is quiet" detail="Run JavaScript to stream sandbox console output here." /> : entries.map((entry) => {
          const Icon = entry.level === "error" ? CircleAlert : entry.level === "warn" ? AlertCircle : entry.level === "info" ? Info : Check;
          return <div className={`${styles.consoleRow} ${styles[`console${entry.level.charAt(0).toUpperCase()}${entry.level.slice(1)}`]}`} key={entry.id}><Icon size={14} aria-label={entry.level} /><code>{entry.text}</code><time>{entry.timestamp}</time></div>;
        })}
      </div>
    </div>
  );
}

function OutputTab({ execution }: { execution: IDEExecution }) {
  const result = execution.result;
  const raw = result?.stdout ?? "";
  return (
    <div className={styles.panelTabBody}>
      <div className={styles.panelToolbar}><span>Raw stdout</span><span>Whitespace preserved</span></div>
      {raw ? <pre className={styles.rawOutput}>{raw}</pre> : <PanelEmpty icon={TerminalSquare} title="No stdout" detail="The judge has not returned raw output for this attempt." />}
    </div>
  );
}

function CaseRow({ testCase, expanded, onToggle, rowRef }: { testCase: NonNullable<JudgeResult["cases"]>[number]; expanded: boolean; onToggle: () => void; rowRef?: (node: HTMLDivElement | null) => void }) {
  const meta = VERDICT_META[testCase.status];
  const Icon = meta.icon;
  const failed = testCase.status !== "accepted";
  return (
    <div className={`${styles.caseRow} ${failed ? styles.caseRowFailed : ""}`} ref={rowRef}>
      <button type="button" className={styles.caseSummary} onClick={onToggle} aria-expanded={expanded}>
        {testCase.hidden ? <LockKeyhole size={14} aria-label="Hidden case" /> : expanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
        <span className={`${styles.caseStatus} ${meta.className}`}><Icon size={13} aria-hidden="true" /> <span>{testCase.hidden ? "Hidden case" : `Case ${testCase.index}`}</span></span>
        <span className={styles.caseVerdict}>{verdictLabel(testCase.status)}</span>
        <span className={styles.caseMetric}>{testCase.runtime_ms}ms</span>
        <span className={styles.caseMetric}>{formatMemory(testCase.memory_kb)}</span>
      </button>
      {expanded && !testCase.hidden ? (
        <div className={styles.caseDetails}>
          {testCase.input !== undefined ? <div><span>Input</span><code>{testCase.input}</code></div> : null}
          {testCase.expected !== undefined ? <div><span>Expected</span><code>{testCase.expected}</code></div> : null}
          {testCase.received !== undefined ? <div><span>Received</span><code>{testCase.received}</code></div> : null}
          {testCase.expected !== undefined && testCase.received !== undefined && testCase.expected !== testCase.received ? <div className={styles.caseDiff}><span>Diff</span><code><i>− {testCase.expected}</i><b>+ {testCase.received}</b></code></div> : null}
        </div>
      ) : null}
    </div>
  );
}

function VirtualCaseList({ cases, expanded, onToggle }: { cases: NonNullable<JudgeResult["cases"]>; expanded: number | null; onToggle: (index: number) => void }) {
  const [range, setRange] = React.useState({ start: 0, end: 28 });
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const rowHeight = 34;
  const updateRange = () => {
    const top = viewportRef.current?.scrollTop ?? 0;
    const start = Math.max(0, Math.floor(top / rowHeight) - 4);
    setRange({ start, end: Math.min(cases.length, start + 32) });
  };
  return (
    <div className={styles.caseVirtualViewport} ref={viewportRef} onScroll={updateRange}>
      <div className={styles.caseVirtualContent} style={{ height: cases.length * rowHeight }}>
        {cases.slice(range.start, range.end).map((testCase, index) => {
          const actualIndex = range.start + index;
          return <div className={styles.caseVirtualRow} style={{ top: actualIndex * rowHeight }} key={testCase.index}><CaseRow testCase={testCase} expanded={expanded === testCase.index} onToggle={() => onToggle(testCase.index)} /></div>;
        })}
      </div>
    </div>
  );
}

function TestcasesTab({ execution }: { execution: IDEExecution }) {
  const cases = execution.result?.cases;
  const [expanded, setExpanded] = React.useState<number | null>(() => cases?.find((testCase) => testCase.status !== "accepted")?.index ?? null);
  const failingRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const firstFailure = cases?.find((testCase) => testCase.status !== "accepted");
    const syncTimer = window.setTimeout(() => {
      setExpanded(firstFailure?.index ?? null);
      if (firstFailure) failingRef.current?.scrollIntoView({ block: "nearest" });
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [cases]);

  if (!cases || cases.length === 0) return <PanelEmpty icon={LockKeyhole} title="Per-case results unavailable" detail="The judge returned aggregate metrics only for this attempt." />;
  const onToggle = (index: number) => setExpanded((current) => current === index ? null : index);
  return <div className={styles.testcaseList}>{cases.length > 50 ? <VirtualCaseList cases={cases} expanded={expanded} onToggle={onToggle} /> : cases.map((testCase) => <CaseRow key={testCase.index} testCase={testCase} expanded={expanded === testCase.index} onToggle={() => onToggle(testCase.index)} rowRef={testCase.status !== "accepted" ? (node) => { failingRef.current = node; } : undefined} />)}</div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ size?: number }> }) {
  return <div className={styles.resultMetric}><span><Icon size={13} /> {label}</span><strong>{value}</strong></div>;
}

function ResultsTab({ execution }: { execution: IDEExecution }) {
  const reduceMotion = useReducedMotion();
  const verdict = executionVerdict(execution);
  const result = execution.result;
  if (!verdict || execution.status === "idle" || execution.status === "running") return <PanelEmpty icon={RotateCcw} title="No graded result yet" detail="Submit a solution to see the judge verdict and real metrics." />;
  const meta = VERDICT_META[verdict];
  const Icon = meta.icon;
  const runtime = result?.runtime_ms ?? execution.runtimeMs;
  const memory = result?.memory_kb !== undefined ? formatMemory(result.memory_kb) : execution.memoryMb !== undefined ? `${execution.memoryMb.toFixed(1)} MB` : null;
  const passed = result?.test_cases_passed ?? execution.passed;
  const total = result?.test_cases_total ?? execution.total;
  const xpTracks = [
    execution.xpCompletion !== undefined ? <span className={styles.xpCompletion} key="completion">+{execution.xpCompletion} completion</span> : null,
    execution.xpMastery !== undefined ? <span className={styles.xpMastery} key="mastery">+{execution.xpMastery} mastery</span> : null,
  ].filter((track): track is React.ReactElement => track !== null);
  return (
    <div className={styles.resultsTab} aria-live="polite">
      <motion.div className={`${styles.verdictTile} ${meta.className}`} initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.4 }}>
        <Icon size={21} aria-hidden="true" />
        <div><strong>{meta.label}</strong><span>{execution.detail ?? "Deterministic checks complete"}</span></div>
      </motion.div>
      <div className={styles.resultMetrics}>
        {runtime !== undefined ? <Metric label="Runtime" value={`${runtime}ms`} icon={Timer} /> : null}
        {memory ? <Metric label="Memory" value={memory} icon={GaugeIcon} /> : null}
        {passed !== undefined && total !== undefined ? <Metric label="Cases" value={`${passed}/${total}`} icon={Check} /> : null}
        {execution.percentile !== undefined ? <Metric label="Percentile" value={`${execution.percentile}%`} icon={ChartIcon} /> : null}
      </div>
      {xpTracks.length > 0 ? <div className={styles.xpTracks} aria-label="Experience earned">{xpTracks}</div> : null}
    </div>
  );
}

function GaugeIcon(props: { size?: number }) { return <Clock3 {...props} />; }
function ChartIcon(props: { size?: number }) { return <Info {...props} />; }

function LogsTab({ logs }: { logs: IDELogEntry[] }) {
  return logs.length === 0 ? <PanelEmpty icon={Clock3} title="No submission lifecycle" detail="Queue and grading events will appear after submit." /> : <div className={styles.logRows}>{logs.map((entry) => <div className={styles.logRow} key={entry.id}><span className={styles.logDot} /><strong>{entry.stage}</strong><time>{entry.at}</time></div>)}</div>;
}

export function BottomPanel({ execution, output, logs, lastRunAt, requestTab, open, height, mobileResults, onClearOutput, onToggle, onHeightChange, files, isFrontend }: BottomPanelProps) {
  const reduceMotion = useReducedMotion();
  const tabs = React.useMemo(() => isFrontend ? [...BASE_TABS, { id: "preview" as const, label: "Preview" }] : BASE_TABS, [isFrontend]);
  const [activeTab, setActiveTab] = React.useState<PanelTab>(requestTab === "results" ? "results" : requestTab === "output" ? "output" : requestTab === "testcases" ? "testcases" : requestTab === "logs" ? "logs" : "console");
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    if (!tabs.some((tab) => tab.id === requestTab)) return;
    const syncTimer = window.setTimeout(() => setActiveTab(requestTab as PanelTab), 0);
    return () => window.clearTimeout(syncTimer);
  }, [requestTab, tabs]);

  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startHeight = height;
    setDragging(true);
    const move = (nextEvent: PointerEvent) => onHeightChange(Math.min(520, Math.max(140, startHeight - (nextEvent.clientY - startY))));
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      setDragging(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  };

  if (!open) return <button type="button" className={styles.bottomPanelCollapsed} onClick={onToggle}><TerminalSquare size={14} /> <span>Open panel</span><ChevronDown size={14} /></button>;
  const body = activeTab === "console" ? <ConsoleTab entries={output} lastRunAt={lastRunAt} onClear={onClearOutput} /> : activeTab === "output" ? <OutputTab execution={execution} /> : activeTab === "testcases" ? <TestcasesTab execution={execution} /> : activeTab === "results" ? <ResultsTab execution={execution} /> : activeTab === "logs" ? <LogsTab logs={logs} /> : <LivePreview files={files} />;

  return (
    <section className={`${styles.bottomPanel} ${mobileResults ? styles.mobileResultsPanel : ""} ${dragging ? styles.panelDragging : ""}`} style={{ "--panel-height": `${height}px` } as React.CSSProperties} aria-label="Execution panel">
      <button type="button" className={styles.panelResizeHandle} onPointerDown={startResize} role="separator" aria-orientation="horizontal" aria-valuemin={140} aria-valuemax={520} aria-valuenow={height} aria-label="Resize execution panel"><span /></button>
      <div className={styles.panelTabStrip} role="tablist" aria-label="Execution output tabs">
        {tabs.map((tab, index) => <button type="button" key={tab.id} role="tab" tabIndex={activeTab === tab.id ? 0 : -1} aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const next = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; const nextTab = tabs[next]; if (!nextTab) return; setActiveTab(nextTab.id); (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus(); } }}>{tab.label}{activeTab === tab.id ? (reduceMotion ? <span className={styles.tabUnderline} /> : <motion.span className={styles.tabUnderline} layoutId="bottom-panel-tab" />) : null}</button>)}
        <button type="button" className={styles.panelCollapseButton} onClick={onToggle} aria-label="Collapse execution panel" title="Collapse panel"><ChevronDown size={14} /></button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {reduceMotion ? <div className={styles.panelBody} key={activeTab}>{body}</div> : <motion.div className={styles.panelBody} key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>{body}</motion.div>}
      </AnimatePresence>
    </section>
  );
}
