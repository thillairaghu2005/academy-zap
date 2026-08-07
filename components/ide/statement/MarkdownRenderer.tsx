"use client";

import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import styles from "../ide.module.css";

export function countMatches(value: string, term: string): number {
  if (!term) return 0;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.match(new RegExp(escaped, "gi"))?.length ?? 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightText(text: string, term: string, startAt: number, current: number): React.ReactNode {
  if (!term) return text;
  const expression = new RegExp(escapeRegExp(term), "gi");
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let occurrence = 0;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(text)) !== null) {
    const matchIndex = startAt + occurrence;
    result.push(text.slice(lastIndex, match.index));
    result.push(<mark key={`${match.index}-${occurrence}`} data-current={matchIndex === current ? "true" : undefined}>{match[0]}</mark>);
    lastIndex = match.index + match[0].length;
    occurrence += 1;
  }
  result.push(text.slice(lastIndex));
  return result;
}

export function HighlightedText({ text, term, startAt, current }: { text: string; term: string; startAt: number; current: number }) {
  return <>{highlightText(text, term, startAt, current)}</>;
}

function StatementCodeBlock({ code, language, colorizeCode }: { code: string; language: string; colorizeCode?: (code: string, language: string) => Promise<string> }) {
  const [highlighted, setHighlighted] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    if (colorizeCode) {
      void colorizeCode(code, language).then((html) => {
        if (active) setHighlighted(html);
      });
    }
    return () => { active = false; };
  }, [code, colorizeCode, language]);

  return (
    <pre className={styles.statementCodeBlock}>
      {highlighted ? <code dangerouslySetInnerHTML={{ __html: highlighted }} /> : <code>{code}</code>}
    </pre>
  );
}

export function MarkdownRenderer({ content, searchTerm = "", matchOffset = 0, currentMatch = -1, colorizeCode }: { content: string; searchTerm?: string; matchOffset?: number; currentMatch?: number; colorizeCode?: (code: string, language: string) => Promise<string> }) {
  const occurrence = { value: matchOffset };
  const markChildren = (children: React.ReactNode) => React.Children.map(children, (child) => {
    if (typeof child !== "string") return child;
    const offset = occurrence.value;
    occurrence.value += countMatches(child, searchTerm);
    return highlightText(child, searchTerm, offset, currentMatch);
  });
  const components: Components = {
    h1: ({ children }) => <h3>{markChildren(children)}</h3>,
    h2: ({ children }) => <h3>{markChildren(children)}</h3>,
    h3: ({ children }) => <h4>{markChildren(children)}</h4>,
    p: ({ children }) => <p>{markChildren(children)}</p>,
    li: ({ children }) => <li>{markChildren(children)}</li>,
    strong: ({ children }) => <strong>{markChildren(children)}</strong>,
    em: ({ children }) => <em>{markChildren(children)}</em>,
    blockquote: ({ children }) => <blockquote>{markChildren(children)}</blockquote>,
    code: ({ children, className }) => {
      const code = String(children).replace(/\n$/, "");
      const language = className?.match(/language-(\w+)/)?.[1] ?? "plaintext";
      const block = Boolean(className) || code.includes("\n");
      return block
        ? <StatementCodeBlock code={code} language={language} colorizeCode={colorizeCode} />
        : <code className={styles.inlineCode}>{markChildren(children)}</code>;
    },
    pre: ({ children }) => <>{children}</>,
    table: ({ children }) => <div className={styles.statementTableWrap}><table>{children}</table></div>,
    th: ({ children }) => <th>{markChildren(children)}</th>,
    td: ({ children }) => <td>{markChildren(children)}</td>,
  };

  return (
    <div className={styles.markdown}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeSanitize]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
