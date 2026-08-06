"use client";

import type { IDELanguage } from "@/types/ide";
import styles from "./ide.module.css";

interface LanguageSelectorProps {
  language: IDELanguage | "plaintext";
  onChange: (language: IDELanguage) => void;
}

const LANGUAGES: Array<{ value: IDELanguage; label: string }> = [
  { value: "html", label: "HTML" }, { value: "css", label: "CSS" }, { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" }, { value: "json", label: "JSON" }, { value: "markdown", label: "Markdown" },
  { value: "python", label: "Python" }, { value: "java", label: "Java" }, { value: "c", label: "C" }, { value: "cpp", label: "C++" },
  { value: "go", label: "Go" }, { value: "rust", label: "Rust" }, { value: "sql", label: "SQL" }, { value: "yaml", label: "YAML" },
  { value: "xml", label: "XML" }, { value: "shell", label: "Shell" },
];

export function LanguageSelector({ language, onChange }: LanguageSelectorProps) {
  return (
    <label className={styles.languageSelect} title="Language mode">
      <span className={styles.srOnly}>Language</span>
      <select value={language} onChange={(event) => onChange(event.target.value as IDELanguage)} aria-label="Language mode">
        {LANGUAGES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
}
