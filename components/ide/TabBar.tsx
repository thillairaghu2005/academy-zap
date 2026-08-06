"use client";

import { FileCode2, X } from "lucide-react";

import type { IDEFile } from "@/types/ide";
import styles from "./ide.module.css";
import * as React from "react";

interface TabBarProps {
  files: IDEFile[];
  openFiles: string[];
  activeFile: string;
  onOpen: (path: string) => void;
  onClose: (path: string) => void;
  onMove: (path: string, targetPath: string) => void;
}

export function TabBar({ files, openFiles, activeFile, onOpen, onClose, onMove }: TabBarProps) {
  const dragged = React.useRef("");
  return (
    <div className={styles.tabBar} role="tablist" aria-label="Open files">
      {openFiles.map((path) => {
        const file = files.find((item) => item.path === path);
        if (!file) return null;
        return <div key={path} className={`${styles.tab} ${activeFile === path ? styles.tabActive : ""}`} draggable onDragStart={() => { dragged.current = path; }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged.current) onMove(dragged.current, path); }} role="tab" aria-selected={activeFile === path} onClick={() => onOpen(path)} title={path}>
          <FileCode2 size={14} className={styles.tabIcon} />
          <span className={styles.tabName}>{file.name}</span>
          {file.dirty ? <span className={styles.tabDirty} aria-label="Unsaved changes">●</span> : null}
          <button className={styles.tabClose} onClick={(event) => { event.stopPropagation(); onClose(path); }} aria-label={`Close ${file.name}`}><X size={14} /></button>
        </div>;
      })}
      <div className={styles.tabSpacer} />
    </div>
  );
}
