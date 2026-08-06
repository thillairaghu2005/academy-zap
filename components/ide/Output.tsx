"use client";

import { CheckCircle2, CircleAlert, FileOutput, Info } from "lucide-react";

import type { IDEProblem } from "@/types/ide";
import styles from "./ide.module.css";

export function Output({ problems }: { problems: IDEProblem[] }) {
  return (
    <div className={styles.panelContent}>
      <div className={styles.panelToolbar}><span className={styles.panelHint}>IDE diagnostics</span><span className={styles.problemCount}>{problems.length} problems</span></div>
      <div className={styles.diagnostics}>
        {problems.length === 0 ? <div className={styles.panelEmpty}><CheckCircle2 size={19} /><span>No problems detected</span><small>Errors and warnings from the active editor will appear here.</small></div> : problems.map((problem, index) => <div className={styles.problemRow} key={`${problem.message}-${index}`}><span className={problem.severity === "error" ? styles.problemError : problem.severity === "warning" ? styles.problemWarning : styles.problemInfo}>{problem.severity === "error" ? <CircleAlert size={14} /> : problem.severity === "warning" ? <Info size={14} /> : <FileOutput size={14} />}</span><span>{problem.file ?? "active file"}{problem.line ? `:${problem.line}` : ""}</span><strong>{problem.message}</strong></div>)}
      </div>
    </div>
  );
}
