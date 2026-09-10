"use client";

import * as React from "react";
import { Search } from "lucide-react";

import styles from "../ide.module.css";
import { STATEMENT_SECTIONS } from "./statement-sections";

// STATEMENT_SECTIONS data lives in ./statement-sections.ts so this file is a
// pure React module for Vite/react-refresh Fast Refresh. Import from there.

export function SectionNav({ activeId, onSearch, onNavigate }: { activeId: string; onSearch: () => void; onNavigate: (id: string) => void }) {
  return (
    <nav className={styles.sectionNav} aria-label="Problem sections">
      <div className={styles.sectionNavScroller} role="tablist" aria-label="Statement section navigation">
        {STATEMENT_SECTIONS.map((section) => (
          <button
            type="button"
            key={section.id}
            role="tab"
            aria-selected={activeId === section.id}
            className={activeId === section.id ? styles.sectionNavActive : ""}
            onClick={() => onNavigate(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>
      <button type="button" className={styles.statementSearchButton} onClick={onSearch} aria-label="Search statement" title="Search statement (⌘F)">
        <Search size={14} aria-hidden="true" />
        <span>⌘F</span>
      </button>
    </nav>
  );
}
