"use client";

import * as React from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

import { MockLabSocket } from "@/lib/mocks/lab-terminal";

import "@xterm/xterm/css/xterm.css";

/**
 * xterm.js terminal (Lab Engine, platform §2.7 — xterm.js locked).
 *
 * Wired to the mock ttyd-style WebSocket bridge (lib/mocks/lab-terminal.ts).
 * The component uses exactly the browser WebSocket surface (onmessage/send/
 * close) — swapping to the real ttyd endpoint later is a constructor change.
 *
 * INPUT MODEL: xterm gives raw keystrokes via onData. A real ttyd bridge
 * pipes those straight into the PTY, but the mock bridge speaks complete
 * LINES (each send() is one shell command). So the terminal runs a small
 * client-side line editor — printable chars buffer, Backspace, Ctrl+C,
 * Ctrl+L clear, Up/Down history, Enter submits the line. This is keystroke
 * echoing/editing (genuinely client-side), NOT objective derivation — that
 * still happens server-side in the mock store.
 *
 * Only loaded client-side via next/dynamic (see terminal-shell.tsx) — xterm
 * manipulates the DOM and must never be evaluated on the server.
 */

export interface LabTerminalProps {
  sessionId: string;
  /** Called once the socket closes (session ended server-side). */
  onSessionClosed?: () => void;
  /** Emitted when a full command line is submitted (used to refresh objective checks). */
  onCommand?: () => void;
  className?: string;
}

export function LabTerminal({
  sessionId,
  onSessionClosed,
  onCommand,
  className,
}: LabTerminalProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const termRef = React.useRef<Terminal | null>(null);
  const socketRef = React.useRef<MockLabSocket | null>(null);
  const lineBufRef = React.useRef<string[]>([]);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      lineHeight: 1.25,
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
      theme: {
        background: "#0b0f14",
        foreground: "#d4dbe6",
        cursor: "#4f8cff",
        selectionBackground: "rgba(79, 140, 255, 0.28)",
        black: "#0b0f14",
        brightBlack: "#5b6a7d",
        red: "#ff5c57",
        brightRed: "#ff5c57",
        green: "#3ddc97",
        brightGreen: "#3ddc97",
        yellow: "#e5c07b",
        brightYellow: "#e5c07b",
        blue: "#4f8cff",
        brightBlue: "#4f8cff",
        magenta: "#c678dd",
        brightMagenta: "#c678dd",
        cyan: "#56b6c2",
        brightCyan: "#56b6c2",
        white: "#d4dbe6",
        brightWhite: "#ffffff",
      },
      scrollback: 2000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();
    termRef.current = term;

    // Keep the terminal sized to its container.
    const ro = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        /* container hidden mid-layout — ignore */
      }
    });
    ro.observe(container);

    // Mock ttyd bridge.
    const socket = new MockLabSocket(sessionId);
    socketRef.current = socket;
    socket.onopen = () => setConnected(true);
    socket.onmessage = (ev) => term.write(ev.data);
    socket.onclose = () => {
      term.write("\r\n\x1b[1;31m[session closed]\x1b[0m\r\n");
      onSessionClosed?.();
    };

    // Local history for Up/Down (mirrors the bridge's own history buffer).
    const localHistory: string[] = [];
    let historyIndex = 0;

    // ---------- Line editor over raw keystrokes ----------
    const dataDisposable = term.onData((data) => {
      if (socket.readyState !== "open") return;
      const buf = lineBufRef.current;

      for (const ch of data) {
        if (ch === "\r") {
          // Enter — erase the live-typed echo, then submit the buffered
          // line. The bridge echoes `$ line` + output, so erasing first
          // keeps the transcript clean (no duplicated input).
          const line = buf.join("");
          for (let i = 0; i < buf.length; i += 1) term.write("\b \b");
          buf.length = 0;
          historyIndex = 0;
          if (line.trim()) localHistory.unshift(line);
          socket.send(line);
          onCommand?.();
        } else if (ch === "\x7f" || ch === "\b") {
          // Backspace.
          if (buf.length > 0) {
            buf.pop();
            term.write("\b \b");
          }
        } else if (ch === "\x03") {
          // Ctrl+C — cancel the current line.
          buf.length = 0;
          historyIndex = 0;
          term.write("^C\r\n");
        } else if (ch === "\x0c") {
          // Ctrl+L — clear screen.
          term.clear();
        } else if (ch === "\x1b[A") {
          // Up arrow — previous history entry.
          if (localHistory.length > 0) {
            historyIndex = Math.min(
              historyIndex + 1,
              localHistory.length,
            );
            const prev = localHistory[historyIndex - 1] ?? "";
            // Rewrite the line: erase current buffer, redraw.
            while (buf.length > 0) {
              buf.pop();
              term.write("\b \b");
            }
            term.write(prev);
            buf.push(...prev.split(""));
          }
        } else if (ch === "\x1b[B") {
          // Down arrow — next history entry.
          if (historyIndex > 0) {
            historyIndex -= 1;
            const next = localHistory[historyIndex - 1] ?? "";
            while (buf.length > 0) {
              buf.pop();
              term.write("\b \b");
            }
            term.write(next);
            buf.push(...next.split(""));
          }
        } else if (ch === "\x1b[C" || ch === "\x1b[D") {
          // Left/right arrows — cursor movement: ignore (line editing is
          // append-only in the mock shell; the real ttyd bridge handles it).
          continue;
        } else if (ch.charCodeAt(0) < 32) {
          // Other control sequences — ignore.
          continue;
        } else {
          buf.push(ch);
          term.write(ch);
        }
      }
    });

    socket.connect();

    return () => {
      dataDisposable.dispose();
      ro.disconnect();
      socket.close();
      term.dispose();
      termRef.current = null;
      socketRef.current = null;
    };
    // sessionId is fixed for the life of a session view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {!connected ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[#0b0f14] text-sm text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
          Establishing encrypted session…
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
