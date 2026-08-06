"use client";

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
  return (
    <label className={styles.themeSelect} title="IDE theme">
      <span className={styles.srOnly}>IDE theme</span>
      <select value={theme} onChange={(event) => onChange(event.target.value as IDETheme)} aria-label="IDE theme">
        {THEMES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
}
