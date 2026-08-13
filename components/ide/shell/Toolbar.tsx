"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  Command,
  Minus,
  Play,
  Plus,
  Send,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";

import type { IDESettings, IDETheme } from "@/types/ide";
import type { JudgeLanguage, ProblemDifficulty } from "@/lib/contracts/judge";
import { JUDGE_LANGUAGE_OPTIONS } from "@/lib/judge-language-config";
import styles from "../ide.module.css";

const THEME_OPTIONS: Array<{ value: IDETheme; label: string }> = [
  { value: "vs-light", label: "Zapsters Light" },
  { value: "github-light", label: "GitHub Light" },
  { value: "solarized-light", label: "Solarized Light" },
  { value: "material-light", label: "Material Light" },
];

function optionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function MenuSelect<T extends string>({
  value,
  options,
  label,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  label: string;
  onChange: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className={`${styles.toolbarSelect} ${className ?? ""}`} ref={rootRef}>
      <button
        type="button"
        className={styles.toolbarSelectTrigger}
        onClick={() => setOpen((current) => !current)}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{optionLabel(options, value === "zapsters-ide-dark" ? ("vs-light" as T) : value)}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open ? (
        <div className={styles.toolbarSelectMenu} role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              className={styles.toolbarSelectOption}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? <Check size={13} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface ToolbarProps {
  title: string;
  difficulty?: ProblemDifficulty;
  topics?: string[];
  language: JudgeLanguage;
  theme: IDETheme;
  settings: IDESettings;
  settingsOpen: boolean;
  canRun: boolean;
  runBusy: boolean;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  onLanguageChange: (language: JudgeLanguage) => void;
  onThemeChange: (theme: IDETheme) => void;
  onSettingsToggle: () => void;
  onSettingsChange: (patch: Partial<IDESettings>) => void;
  onRun: () => void;
  onFontStep: (delta: number) => void;
  onOpenPalette: () => void;
}

export function Toolbar({
  title,
  difficulty,
  topics = [],
  language,
  theme,
  settings,
  settingsOpen,
  canRun,
  runBusy,
  primaryAction,
  onLanguageChange,
  onThemeChange,
  onSettingsToggle,
  onSettingsChange,
  onRun,
  onFontStep,
  onOpenPalette,
}: ToolbarProps) {
  const visibleTopics = topics.slice(0, 2);
  const topicOverflow = Math.max(0, topics.length - visibleTopics.length);

  return (
    <header className={styles.toolbar}>
      <div className={styles.toolbarProblem}>
        <span className={styles.toolbarEyebrow}>JUDGE</span>
        <strong className={styles.toolbarTitle} title={title}>{title}</strong>
        {difficulty ? <span className={`${styles.difficultyPill} ${styles[`difficulty${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`]}`}>{difficulty}</span> : null}
        <div className={styles.topicChips} aria-label="Problem topics">
          {visibleTopics.map((topic) => <span className={styles.topicChip} key={topic}>{topic}</span>)}
          {topicOverflow > 0 ? <span className={styles.topicOverflow}>+{topicOverflow}</span> : null}
        </div>
      </div>

      <div className={styles.toolbarActions}>
        <MenuSelect
          className={styles.toolbarLanguage}
          value={language}
          options={JUDGE_LANGUAGE_OPTIONS}
          label="Programming language"
            onChange={onLanguageChange}
        />
        <MenuSelect
          className={styles.toolbarTheme}
          value={theme}
          options={THEME_OPTIONS}
          label="Editor theme"
          onChange={onThemeChange}
        />
        <div className={`${styles.fontStepper} ${styles.toolbarFont}`} aria-label="Editor font size">
          <span>Aa</span>
          <button type="button" onClick={() => onFontStep(-1)} disabled={settings.fontSize <= 12} aria-label="Decrease font size"><Minus size={12} /></button>
          <strong>{settings.fontSize}</strong>
          <button type="button" onClick={() => onFontStep(1)} disabled={settings.fontSize >= 20} aria-label="Increase font size"><Plus size={12} /></button>
        </div>
        <button type="button" className={styles.paletteHint} onClick={onOpenPalette} aria-label="Open IDE command palette">
          <Command size={12} aria-hidden="true" /> K
        </button>
        <button type="button" className={styles.toolbarIconButton} onClick={onSettingsToggle} aria-label="Open IDE settings" aria-pressed={settingsOpen} title="IDE settings">
          <Settings2 size={15} aria-hidden="true" />
        </button>
        <div className={styles.primaryActions}>
          <button type="button" className={`${styles.ideButton} ${styles.runButton}`} onClick={onRun} disabled={!canRun || runBusy} aria-keyshortcuts="Control+Enter">
            {runBusy ? <span className={styles.spinner} aria-hidden="true" /> : <Play size={14} fill="currentColor" aria-hidden="true" />}
            {runBusy ? "Running" : "Run"}
          </button>
          {primaryAction ? (
            <button type="button" className={`${styles.ideButton} ${styles.submitButton}`} onClick={primaryAction.onClick} disabled={primaryAction.disabled} aria-keyshortcuts="Control+Shift+Enter">
              <Send size={14} aria-hidden="true" />
              {primaryAction.label}
            </button>
          ) : null}
        </div>
      </div>

      {settingsOpen ? (
        <dialog open className={styles.settingsPopover} aria-label="IDE settings">
          <div className={styles.settingsPopoverTitle}><SlidersHorizontal size={14} /> Editor settings</div>
          <label className={styles.settingsRow}><span>Word wrap</span><input type="checkbox" checked={settings.wordWrap} onChange={(event) => onSettingsChange({ wordWrap: event.target.checked })} /></label>
          <label className={styles.settingsRow}><span>Minimap</span><input type="checkbox" checked={settings.minimap} onChange={(event) => onSettingsChange({ minimap: event.target.checked })} /></label>
          <label className={styles.settingsRange}><span>Font size <b>{settings.fontSize}px</b></span><input type="range" min="12" max="20" value={settings.fontSize} onChange={(event) => onSettingsChange({ fontSize: Number(event.target.value) })} /></label>
          <div className={styles.settingsNarrowTheme}>
            <span>Theme</span>
            <MenuSelect value={theme} options={THEME_OPTIONS} label="Editor theme" onChange={onThemeChange} />
          </div>
        </dialog>
      ) : null}
    </header>
  );
}
