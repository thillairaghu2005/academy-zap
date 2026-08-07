"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import type { IDETheme } from "@/types/ide";
import styles from "./ide.module.css";

interface ThemeSwitcherProps {
  theme: IDETheme;
  onChange: (theme: IDETheme) => void;
}

const THEMES: Array<{ value: IDETheme; label: string }> = [
  { value: "vs-dark", label: "VS Dark" },
  { value: "vs-light", label: "VS Light" },
  { value: "github-dark", label: "GitHub Dark" },
  { value: "github-light", label: "GitHub Light" },
  { value: "one-dark-pro", label: "One Dark Pro" },
  { value: "dracula", label: "Dracula" },
  { value: "monokai", label: "Monokai" },
  { value: "solarized-dark", label: "Solarized Dark" },
  { value: "solarized-light", label: "Solarized Light" },
  { value: "nord", label: "Nord" },
  { value: "material-dark", label: "Material Dark" },
  { value: "material-light", label: "Material Light" },
];

export function ThemeSwitcher({ theme, onChange }: ThemeSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const current = THEMES.find((item) => item.value === theme)?.label ?? theme;

  return (
    <div className={styles.themeSelect} title="IDE theme">
      <span className={styles.srOnly}>IDE theme</span>
      <button className={styles.selectTrigger} onClick={() => setOpen((currentOpen) => !currentOpen)} aria-label="IDE theme" aria-expanded={open}>{current}<ChevronDown size={12} /></button>
      {open ? <div className={styles.selectMenu} role="menu">{THEMES.map((item) => <button key={item.value} className={styles.selectOption} onClick={() => { onChange(item.value); setOpen(false); }} role="menuitem"><span>{item.label}</span>{item.value === theme ? <Check size={13} /> : null}</button>)}</div> : null}
    </div>
  );
}
