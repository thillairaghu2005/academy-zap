"use client";

import { AlertCircle, CheckCircle2, Info, Terminal, Trash2, TriangleAlert } from "lucide-react";

import type { IDEOutputEntry } from "@/types/ide";
import styles from "./ide.module.css";

interface ConsoleProps {
  entries: IDEOutputEntry[];
  onClear: () => void;
  lastRunAt: string | null;
}

export function Console({ entries, onClear, lastRunAt }: ConsoleProps) {
  return (
    <div className={styles.panelContent}>
      <div className={styles.panelToolbar}><span className={styles.panelHint}>{lastRunAt ? `Last run ${new Date(lastRunAt).toLocaleTimeString()}` : "Ready"}</span><button className={styles.panelClear} onClick={onClear}><Trash2 size={13} /> Clear</button></div>
      <div className={styles.consoleOutput} aria-live="polite">
        {entries.length === 0 ? <div className={styles.panelEmpty}><Terminal size={19} /><span>Console output will appear here</span><small>Run JavaScript with the Run button or Ctrl+Enter.</small></div> : entries.map((entry) => <div className={`${styles.consoleLine} ${styles[`console${entry.level.charAt(0).toUpperCase()}${entry.level.slice(1)}`]}`} key={entry.id}><span className={styles.consoleIcon}>{entry.level === "error" ? <AlertCircle size={14} /> : entry.level === "warn" ? <TriangleAlert size={14} /> : entry.level === "info" ? <Info size={14} /> : <CheckCircle2 size={14} />}</span><span className={styles.consoleTimestamp}>{entry.timestamp}</span><code>{entry.text}</code></div>)}
      </div>
    </div>
  );
}
