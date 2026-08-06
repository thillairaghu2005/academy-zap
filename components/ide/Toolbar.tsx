"use client";

import { ChevronDown, Code2, Eye, Play, RotateCcw, Save, Settings2, SquareTerminal } from "lucide-react";

import type { IDELanguage, IDETheme } from "@/types/ide";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeSwitcher } from "./ThemeSwitcher";
import styles from "./ide.module.css";

interface ToolbarProps {
  language: IDELanguage | "plaintext";
  theme: IDETheme;
  onLanguageChange: (language: IDELanguage) => void;
  onThemeChange: (theme: IDETheme) => void;
  onRun: () => void;
  onPreview: () => void;
  onReset: () => void;
  onToggleSettings: () => void;
  onSave: () => void;
  canRun: boolean;
  previewOpen: boolean;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
}

export function Toolbar({ language, theme, onLanguageChange, onThemeChange, onRun, onPreview, onReset, onToggleSettings, onSave, canRun, previewOpen, primaryAction }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarBrand}><Code2 size={16} /><span>Code workspace</span><ChevronDown size={13} /></div>
      <div className={styles.toolbarActions}>
        <button className={`${styles.toolbarButton} ${styles.runButton}`} onClick={onRun} disabled={!canRun} title="Run JavaScript (Ctrl+Enter)"><Play size={14} fill="currentColor" /> Run</button>
        {primaryAction ? <button className={`${styles.toolbarButton} ${styles.primaryAction}`} onClick={primaryAction.onClick} disabled={primaryAction.disabled}>{primaryAction.label}</button> : null}
        <button className={`${styles.toolbarButton} ${previewOpen ? styles.toolbarButtonActive : ""}`} onClick={onPreview} title="Toggle live preview"><Eye size={15} /> <span className={styles.toolbarText}>Preview</span></button>
        <button className={styles.toolbarButton} onClick={onSave} title="Save file"><Save size={14} /> <span className={styles.toolbarText}>Save</span></button>
        <button className={styles.toolbarIconButton} onClick={onReset} title="Reset current file" aria-label="Reset current file"><RotateCcw size={15} /></button>
        <button className={styles.toolbarIconButton} onClick={onToggleSettings} title="Editor settings" aria-label="Editor settings"><Settings2 size={15} /></button>
        <div className={styles.toolbarDivider} />
        <LanguageSelector language={language} onChange={onLanguageChange} />
        <ThemeSwitcher theme={theme} onChange={onThemeChange} />
        <SquareTerminal size={15} className={styles.toolbarTerminalIcon} aria-hidden="true" />
      </div>
    </div>
  );
}
