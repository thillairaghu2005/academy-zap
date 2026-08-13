"use client";

import * as React from "react";
import { Clock3, Gauge, ShieldCheck, Sparkles, Terminal, Users } from "lucide-react";

import type { Problem } from "@/lib/contracts/judge";
import { GatedSection } from "./GatedSection";
import { countMatches, HighlightedText, MarkdownRenderer } from "./MarkdownRenderer";
import { SampleCase } from "./SampleCase";
import { SectionNav, STATEMENT_SECTIONS } from "./SectionNav";
import { StatementSearch } from "./StatementSearch";
import styles from "../ide.module.css";

function searchSegments(problem: Problem): string[] {
  return [
    problem.title,
    problem.statement,
    ...problem.sample_cases.flatMap((sample) => [sample.input, sample.output, sample.explanation ?? ""]),
    ...problem.constraints,
    `${problem.time_limit_ms}ms ${(problem.memory_limit_kb / 1024).toFixed(0)}MB ${problem.hidden_test_count}`,
  ];
}

function offsetFor(segments: string[], index: number, term: string): number {
  return segments.slice(0, index).reduce((total, segment) => total + countMatches(segment, term), 0);
}

export const StatementPane = React.memo(function StatementPane({ problem, colorizeCode }: { problem: Problem; colorizeCode?: (code: string, language: string) => Promise<string> }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = React.useState<string>(STATEMENT_SECTIONS[0].id);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentMatch, setCurrentMatch] = React.useState(0);
  const segments = React.useMemo(() => searchSegments(problem), [problem]);
  const searchableText = segments.join("\n");
  const matchCount = countMatches(searchableText, searchTerm);

  React.useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
  }, [searchOpen]);

  React.useEffect(() => {
    setCurrentMatch(0);
  }, [searchTerm]);

  React.useEffect(() => {
    if (!searchOpen || !searchTerm || matchCount === 0) return;
    const scrollTimer = window.setTimeout(() => {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      scrollRef.current?.querySelector('mark[data-current="true"]')?.scrollIntoView({ block: "center", behavior });
    }, 0);
    return () => window.clearTimeout(scrollTimer);
  }, [currentMatch, matchCount, searchOpen, searchTerm]);

  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]?.target.id) setActiveId(visible[0].target.id);
    }, { root, rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.75] });
    STATEMENT_SECTIONS.forEach(({ id }) => {
      const section = root.querySelector(`#${id}`);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [problem.id]);

  React.useEffect(() => {
    const find = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f" && !target?.closest(".monaco-editor")) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", find);
    return () => window.removeEventListener("keydown", find);
  }, []);

  const navigate = (id: string) => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    scrollRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior, block: "start" });
    setActiveId(id);
  };

  const cycleMatch = (direction: 1 | -1) => {
    if (matchCount === 0) return;
    setCurrentMatch((current) => (current + direction + matchCount) % matchCount);
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setSearchTerm("");
      setSearchOpen(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      cycleMatch(event.shiftKey ? -1 : 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      cycleMatch(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      cycleMatch(1);
    }
  };

  const statementOffset = offsetFor(segments, 1, searchTerm);
  const sampleBase = 2;

  return (
    <aside className={styles.statementPane} aria-label="Problem statement">
      <StatementSearch open={searchOpen} term={searchTerm} current={currentMatch} count={matchCount} inputRef={searchInputRef} onTermChange={setSearchTerm} onKeyDown={onSearchKeyDown} onClose={() => { setSearchTerm(""); setSearchOpen(false); }} />
      <div className={styles.statementScroll} ref={scrollRef}>
        <div className={styles.statementReadingColumn}>
          <div className={styles.statementIntro}>
            <span className={styles.statementEyebrow}>PROBLEM STATEMENT</span>
            <h1><HighlightedText text={problem.title} term={searchTerm} startAt={0} current={currentMatch} /></h1>
            <div className={styles.limitsStrip} aria-label="Problem limits summary">
              <span><Clock3 size={13} /> <b>{problem.time_limit_ms}ms</b> time</span>
              <span><Gauge size={13} /> <b>{(problem.memory_limit_kb / 1024).toFixed(0)}MB</b> memory</span>
              <span><Terminal size={13} /> <b>{problem.hidden_test_count}</b> hidden</span>
            </div>
          </div>

          <SectionNav activeId={activeId} onSearch={() => setSearchOpen(true)} onNavigate={navigate} />

          <section className={styles.statementSection} id="description">
            <h2>Description</h2>
            <MarkdownRenderer content={problem.statement} searchTerm={searchTerm} matchOffset={statementOffset} currentMatch={currentMatch} colorizeCode={colorizeCode} />
          </section>

          <section className={styles.statementSection} id="examples">
            <h2>Examples</h2>
            <div className={styles.sampleList}>
              {problem.sample_cases.map((sample, index) => {
                const inputSegment = sampleBase + index * 3;
                const outputSegment = inputSegment + 1;
                 return <SampleCase key={`${sample.input}-${sample.output}`} sample={sample} index={index} searchTerm={searchTerm} inputOffset={offsetFor(segments, inputSegment, searchTerm)} outputOffset={offsetFor(segments, outputSegment, searchTerm)} currentMatch={currentMatch} />;
              })}
            </div>
          </section>

          <section className={styles.statementSection} id="constraints">
            <h2>Constraints</h2>
            <ul className={styles.constraintList}>
              {problem.constraints.map((constraint, index) => <li key={constraint}><span /> <code><HighlightedText text={constraint} term={searchTerm} startAt={offsetFor(segments, sampleBase + problem.sample_cases.length * 3 + index, searchTerm)} current={currentMatch} /></code></li>)}
            </ul>
          </section>

          <section className={styles.statementSection} id="limits">
            <h2>Limits</h2>
            <div className={styles.limitsStrip}>
              <span><Clock3 size={13} /> <b>{problem.time_limit_ms}ms</b> time limit</span>
              <span><Gauge size={13} /> <b>{(problem.memory_limit_kb / 1024).toFixed(0)}MB</b> memory limit</span>
              <span><Terminal size={13} /> <b>{problem.hidden_test_count}</b> hidden cases</span>
            </div>
          </section>

          <GatedSection id="hints" title="Hints" revealLabel="Reveal hint 1 of 3" consequence="Hints expose one step of the intended approach.">
            <p>Start by identifying the information that must be remembered while scanning the input once.</p>
          </GatedSection>
          <GatedSection id="editorial" title="Editorial" revealLabel="Unlock the editorial" consequence="The editorial reveals the full intended approach.">
            <p>Try to write down the invariant before reading the full solution.</p>
          </GatedSection>

          <div className={styles.trustRow} aria-label="Judge trust signals">
            <span><ShieldCheck size={13} /> Secure sandbox</span>
            <span><Sparkles size={13} /> Deterministic grading</span>
            <span><Users size={13} /> Anti-plagiarism review</span>
          </div>

          <section className={styles.statementSection} id="discussion">
            <h2>Discussion</h2>
            <p className={styles.discussionCopy}>Compare approaches with other learners after you have submitted a solution.</p>
          </section>
        </div>
      </div>
    </aside>
  );
}, (previous, next) => previous.problem.id === next.problem.id && previous.colorizeCode === next.colorizeCode);
