"use client";

import * as React from "react";
import { m as motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, LoaderCircle, Play, RotateCcw } from "lucide-react";

import { motionSprings } from "@/components/motion/motion-tokens";

const CODE = [
  ["def ", "detect_beaconing", "(events):"],
  ["    ", "alerts", " = []"],
  ["    ", "for ", "e", " in ", "events", ":"],
  ["        ", "if ", "e", "[\"beacon\"] ", "and ", "e", "[\"interval\"] ", "> 30", ":"],
  ["            ", "alerts", ".append(", "e", "[\"src\"]", ")"],
  ["    ", "return ", "alerts"],
] as const;

type Phase = "idle" | "running" | "accepted";

const RESULTS = [
  { line: "✓ 3 candidate beacons flagged", className: "text-white/80" },
  { line: "✓ rule passed in 0.4s", className: "text-white/80" },
  { line: "✓ all sample cases accepted", className: "text-white/80" },
] as const;

/** Browser-framed Judge mock (UI §2.1): type a submission, watch the verdict. */
export function JudgeMock() {
  const reducedMotion = useReducedMotion() ?? false;
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [typedLines, setTypedLines] = React.useState(0);
  const [resultLines, setResultLines] = React.useState(0);

  const run = () => {
    if (phase === "running") return;
    setPhase("running");
    setTypedLines(0);
    setResultLines(0);
    const lineTimer = window.setInterval(() => {
      setTypedLines((count) => {
        if (count >= CODE.length) {
          window.clearInterval(lineTimer);
          return count;
        }
        return count + 1;
      });
    }, reducedMotion ? 0 : 160);
    window.setTimeout(() => {
      window.clearInterval(lineTimer);
      setTypedLines(CODE.length);
      const resultTimer = window.setInterval(() => {
        setResultLines((count) => {
          if (count >= RESULTS.length) {
            window.clearInterval(resultTimer);
            setPhase("accepted");
            return count;
          }
          return count + 1;
        });
      }, reducedMotion ? 0 : 320);
    }, reducedMotion ? 0 : CODE.length * 160 + 240);
  };

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_28px_70px_rgb(23_23_23_/_18%)]"
      role="img"
      aria-label="Live preview of the Zapsters code judge: typing a submission and receiving an accepted verdict"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border-strong" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-border-strong" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-border-strong" aria-hidden="true" />
        <div className="ml-3 flex-1 truncate rounded-md bg-surface-1 px-3 py-1 font-mono text-[11px] text-muted-foreground">
          app.zapsters.io/judge/beaconing-detect
        </div>
      </div>

      {/* Problem header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Detect command-and-control beaconing</p>
          <p className="text-[11px] text-muted-foreground">Judge · Python 3 · sample cases 3 / 3</p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={phase === "running"}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm outline-none transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
        >
          {phase === "running" ? <LoaderCircle className="size-3.5 animate-spin" /> : phase === "accepted" ? <RotateCcw className="size-3.5" /> : <Play className="size-3.5" />}
          {phase === "running" ? "Running…" : phase === "accepted" ? "Run again" : "Run"}
        </button>
      </div>

      {/* Editor */}
      <div className="bg-[#0c0f14] px-4 py-3 font-mono text-xs leading-6">
        {CODE.slice(0, typedLines).map((tokens, lineIndex) => (
          <p key={lineIndex} className="flex gap-3">
            <span className="w-4 select-none text-right text-white/25">{lineIndex + 1}</span>
            <span className="text-white">
              {tokens.map((token, index) => {
                const tone =
                  index === 0 && (token.trim() === "def" || token.trim() === "for" || token.trim() === "if" || token.trim() === "return")
                    ? "text-[#c678dd]"
                    : token.trim().startsWith('"') || token.trim().startsWith("[\"")
                      ? "text-[#98c379]"
                      : token.startsWith("e") && index === 2
                        ? "text-[#e5c07b]"
                        : "text-white/90";
                return (
                  <span key={index} className={tone}>
                    {token}
                  </span>
                );
              })}
            </span>
          </p>
        ))}
        {typedLines < CODE.length ? (
          <span className="inline-block h-3.5 w-2 animate-pulse bg-white/80 align-middle" aria-hidden="true" />
        ) : null}
      </div>

      {/* Verdict console */}
      <div className="min-h-[92px] bg-[#0c0f14] px-4 pb-4 pt-1 font-mono text-xs leading-6">
        {resultLines > 0 ? (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-0.5"
          >
            {RESULTS.slice(0, resultLines).map((result) => (
              <p key={result.line} className={result.className}>
                {result.line}
              </p>
            ))}
          </motion.div>
        ) : (
          <p className="text-white/30">
            {phase === "running" ? "Compiling submission…" : "$ run"}
          </p>
        )}
        {phase === "accepted" ? (
          <motion.div
            initial={reducedMotion ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={motionSprings.momentum}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-success/20 px-3 py-1.5 text-[11px] font-bold text-white"
          >
            <CheckCircle2 className="size-3.5" /> Accepted — rank tick +1
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}