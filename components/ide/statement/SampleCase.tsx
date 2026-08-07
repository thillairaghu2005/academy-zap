"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import type { SampleCase as JudgeSampleCase } from "@/lib/contracts/judge";
import { HighlightedText } from "./MarkdownRenderer";
import styles from "../ide.module.css";

export function SampleCase({ sample, index, searchTerm, inputOffset, outputOffset, currentMatch }: { sample: JudgeSampleCase; index: number; searchTerm: string; inputOffset: number; outputOffset: number; currentMatch: number }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(`${sample.input}\n${sample.output}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className={styles.sampleCase}>
      <header><span>Example {index + 1}</span><button type="button" onClick={copy} aria-label={`Copy example ${index + 1}`}>{copied ? <Check size={13} /> : <Copy size={13} />}<span>{copied ? "Copied" : "Copy"}</span></button></header>
      <div className={styles.sampleGrid}>
        <div><span className={styles.sampleLabel}>Input</span><pre><HighlightedText text={sample.input} term={searchTerm} startAt={inputOffset} current={currentMatch} /></pre></div>
        <div><span className={styles.sampleLabel}>Output</span><pre><HighlightedText text={sample.output} term={searchTerm} startAt={outputOffset} current={currentMatch} /></pre></div>
      </div>
      {sample.explanation ? <p className={styles.sampleExplanation}>{sample.explanation}</p> : null}
    </article>
  );
}
