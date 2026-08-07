"use client";

import * as React from "react";
import { ChevronRight, LockKeyhole } from "lucide-react";

import styles from "../ide.module.css";

export function GatedSection({ id, title, consequence, revealLabel, children }: { id: string; title: string; consequence: string; revealLabel: string; children?: React.ReactNode }) {
  const [revealed, setRevealed] = React.useState(false);
  return (
    <section className={`${styles.statementSection} ${styles.gatedSection}`} id={id}>
      <button type="button" className={styles.gatedHeader} onClick={() => setRevealed((current) => !current)} aria-expanded={revealed}>
        <span className={styles.gatedIcon}><LockKeyhole size={14} /></span>
        <span><strong>{title}</strong><small>{revealed ? consequence : revealLabel}</small></span>
        <ChevronRight size={15} className={revealed ? styles.gatedChevronOpen : ""} aria-hidden="true" />
      </button>
      {revealed ? <div className={styles.gatedContent}>{children ?? <p>{consequence}</p>}</div> : null}
    </section>
  );
}
