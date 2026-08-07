"use client";

import * as React from "react";
import { Braces, FileCode2, Maximize2, Redo2, Undo2, WrapText } from "lucide-react";

import type { IDEFile } from "@/types/ide";
import styles from "../ide.module.css";

export function EditorHeader({
  file,
  saved,
  onUndo,
  onRedo,
  onFormat,
  formatAvailable,
  wordWrap,
  onToggleWordWrap,
  onFullscreen,
}: {
  file: IDEFile | undefined;
  saved: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFormat: () => void;
  formatAvailable: boolean;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  onFullscreen: () => void;
}) {
  return (
    <header className={styles.editorHeader}>
      <div className={styles.editorFileName}>
        <FileCode2 size={14} aria-hidden="true" />
        <strong>{file?.name ?? "solution.py"}</strong>
        <span className={styles.languagePill}>{file?.language ?? "plaintext"}</span>
        <span className={`${styles.editorSaveState} ${saved ? "" : styles.editorUnsaved}`}><span /> {saved ? "Saved" : "Unsaved"}</span>
      </div>
      <div className={styles.editorHeaderActions}>
        <button type="button" onClick={onUndo} aria-label="Undo" title="Undo"><Undo2 size={14} /></button>
        <button type="button" onClick={onRedo} aria-label="Redo" title="Redo"><Redo2 size={14} /></button>
        <button type="button" onClick={onFormat} disabled={!formatAvailable} aria-label="Format document" title={formatAvailable ? "Format document" : "No formatter registered for this language"}><Braces size={14} /><span>Format</span></button>
        <button type="button" onClick={onToggleWordWrap} aria-label="Toggle word wrap" aria-pressed={wordWrap} title="Toggle word wrap"><WrapText size={14} /></button>
        <button type="button" onClick={onFullscreen} aria-label="Toggle fullscreen" title="Toggle fullscreen"><Maximize2 size={14} /></button>
      </div>
    </header>
  );
}
