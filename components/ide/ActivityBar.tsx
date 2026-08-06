"use client";

import { Braces, Files, GitBranch, Search, Settings2 } from "lucide-react";

import styles from "./ide.module.css";

interface ActivityBarProps {
  explorerOpen: boolean;
  onExplorerToggle: () => void;
  onSettings: () => void;
}

export function ActivityBar({ explorerOpen, onExplorerToggle, onSettings }: ActivityBarProps) {
  return (
    <nav className={styles.activityBar} aria-label="IDE views">
      <button className={`${styles.activityButton} ${explorerOpen ? styles.activityActive : ""}`} onClick={onExplorerToggle} aria-label="Toggle explorer" aria-pressed={explorerOpen}>
        <Files size={20} strokeWidth={1.7} />
      </button>
      <button className={styles.activityButton} aria-label="Search in files" title="Search in files">
        <Search size={20} strokeWidth={1.7} />
      </button>
      <button className={styles.activityButton} aria-label="Source control" title="Source control">
        <GitBranch size={20} strokeWidth={1.7} />
        <span className={styles.activityBadge}>0</span>
      </button>
      <button className={styles.activityButton} aria-label="Run and debug" title="Run and debug">
        <Braces size={20} strokeWidth={1.7} />
      </button>
      <button className={`${styles.activityButton} ${styles.activityBottom}`} onClick={onSettings} aria-label="Editor settings" title="Editor settings">
        <Settings2 size={20} strokeWidth={1.7} />
      </button>
    </nav>
  );
}
