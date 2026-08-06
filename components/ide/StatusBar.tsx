"use client";

import { Bell, Check, GitBranch, Radio, Wifi } from "lucide-react";

import type { IDEFile } from "@/types/ide";
import styles from "./ide.module.css";

export function StatusBar({ file, lineCount }: { file: IDEFile | undefined; lineCount: number }) {
  return (
    <footer className={styles.statusBar}>
      <div className={styles.statusLeft}><span><GitBranch size={12} /> main</span><span><Radio size={12} /> IDE local</span></div>
      <div className={styles.statusRight}><span>{file?.language ?? "Plain Text"}</span><span>UTF-8</span><span>LF</span><span>Ln 1, Col 1</span><span>{lineCount} lines</span><span className={styles.statusSaved}><Check size={12} /> Auto Save</span><span><Wifi size={12} /> Offline</span><span><Bell size={12} /></span></div>
    </footer>
  );
}
