"use client";

import * as React from "react";
import { Search } from "lucide-react";

import styles from "../ide.module.css";

export const STATEMENT_SECTIONS = [
  { id: "description", label: "Description" },
  { id: "examples", label: "Examples" },
  { id: "constraints", label: "Constraints" },
  { id: "limits", label: "Limits" },
  { id: "hints", label: "Hints" },
  { id: "editorial", label: "Editorial" },
  { id: "discussion", label: "Discussion" },
] as const;

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
