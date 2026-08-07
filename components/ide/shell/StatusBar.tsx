"use client";

import * as React from "react";
import { Check, CircleAlert, Code2, LoaderCircle } from "lucide-react";

import type { IDEFile } from "@/types/ide";
import type { IDEExecution } from "../IDE";
import styles from "../ide.module.css";

interface StatusBarProps {
  file: IDEFile | undefined;
  cursor: { line: number; column: number };
  saved: boolean;
  execution: IDEExecution;
}

export function StatusBar({ file, cursor, saved, execution }: StatusBarProps) {
  const detail = execution.detail?.toLowerCase() ?? "";
  const stage = execution.status === "running"
    ? detail.includes("grading") ? "grading" : detail.includes("running") ? "running" : "queued"
    : execution.status === "idle" ? "ready" : "graded";

  return (
    <footer className={styles.statusBar}>
      <div className={styles.statusBarLeft}>
        <span><Code2 size={12} aria-hidden="true" /> {file?.language ?? "Plain Text"}</span>
        <span>UTF-8</span>
        <span>LF</span>
      </div>
      <div className={styles.statusBarRight}>
        <span>Ln {cursor.line}, Col {cursor.column}</span>
        <span className={styles.statusStage} aria-live="polite">
          {stage === "ready" ? <Check size={12} aria-hidden="true" /> : stage === "graded" ? <CircleAlert size={12} aria-hidden="true" /> : <LoaderCircle size={12} className={styles.spin} aria-hidden="true" />}
          {stage}
        </span>
        <span className={saved ? styles.statusSaved : styles.statusUnsaved}>{saved ? "saved" : "unsaved"}</span>
        <span className={styles.statusHint}>Esc then Tab to leave editor · ⌘Enter run</span>
      </div>
    </footer>
  );
}
