"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

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
  const [open, setOpen] = React.useState(false);
  const current = LANGUAGES.find((item) => item.value === language)?.label ?? language;

  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div className={styles.languageSelect} title="Language mode">
      <span className={styles.srOnly}>Language</span>
      <button className={styles.selectTrigger} onClick={(event) => { event.stopPropagation(); setOpen((currentOpen) => !currentOpen); }} aria-label="Language mode" aria-expanded={open}>
        <span className={styles.languageDot} /> {current} <ChevronDown size={12} />
      </button>
      {open ? <div className={styles.selectMenu} role="menu">{LANGUAGES.map((item) => <button key={item.value} className={styles.selectOption} onClick={() => { onChange(item.value); setOpen(false); }} role="menuitem"><span>{item.label}</span>{item.value === language ? <Check size={13} /> : null}</button>)}</div> : null}
    </div>
  );
}
