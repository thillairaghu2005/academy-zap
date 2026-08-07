"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";

import styles from "../ide.module.css";

export function StatementSearch({
  open,
  term,
  current,
  count,
  inputRef,
  onTermChange,
  onKeyDown,
  onClose,
}: {
  open: boolean;
  term: string;
  current: number;
  count: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onTermChange: (term: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className={styles.statementSearch} role="search" aria-label="Search problem statement">
      <Search size={14} aria-hidden="true" />
      <input ref={inputRef} value={term} onChange={(event) => onTermChange(event.target.value)} onKeyDown={onKeyDown} placeholder="Search statement" aria-label="Search statement" />
      <span className={styles.searchCount}>{term ? `${count === 0 ? 0 : current + 1} of ${count}` : "Type to search"}</span>
      <button type="button" onClick={() => onKeyDown({ key: "ArrowUp", preventDefault: () => undefined } as React.KeyboardEvent<HTMLInputElement>)} aria-label="Previous match"><ArrowUp size={13} /></button>
      <button type="button" onClick={() => onKeyDown({ key: "ArrowDown", preventDefault: () => undefined } as React.KeyboardEvent<HTMLInputElement>)} aria-label="Next match"><ArrowDown size={13} /></button>
      <button type="button" onClick={onClose} aria-label="Close statement search"><X size={14} /></button>
    </div>
  );
}
