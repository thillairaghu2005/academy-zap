"use client";

import * as React from "react";

import type { IDEOutputEntry, IDEPanel, IDETheme } from "@/types/ide";

const THEME_STORAGE_KEY = "ide:theme";
const CHROME_STORAGE_KEY = "ide:chrome";

export const SANDBOX_DOCUMENT = `<!doctype html><html><body><script>
(() => {
  const serialize = (value) => {
    if (typeof value === "string") return value;
    try { return JSON.stringify(value, (_, nested) => typeof nested === "bigint" ? nested.toString() + "n" : nested); }
    catch { return String(value); }
  };
  const parentOrigin = (() => {
    try { return new URL(document.referrer).origin; }
    catch { return null; }
  })();
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || !parentOrigin || event.origin !== parentOrigin) return;
    const data = event.data;
    if (!data || data.type !== "ide-run" || typeof data.runId !== "string" || typeof data.source !== "string") return;
    const entries = [];
    const write = (level, values) => entries.push({ level, text: values.map(serialize).join(" ") });
    const original = { log: console.log, info: console.info, warn: console.warn, error: console.error };
    ["log", "info", "warn", "error"].forEach((level) => {
      console[level] = (...values) => { write(level, values); original[level](...values); };
    });
    window.onerror = (message, source, line) => { write("error", [message + (line ? " (line " + line + ")" : "")]); };
    window.onunhandledrejection = (rejection) => { write("error", [rejection.reason ?? "Unhandled promise rejection"]); };
    try {
      const script = document.createElement("script");
      script.textContent = data.source;
      document.body.appendChild(script);
    } catch (error) {
      write("error", [error]);
    }
    window.setTimeout(() => event.source?.postMessage({ type: "ide-run-result", runId: data.runId, entries }, event.origin), 150);
  });
})();
</script></body></html>`;

interface SandboxMessage {
  type: "ide-run-result";
  runId: string;
  entries: Array<{ level: IDEOutputEntry["level"]; text: string }>;
}

function isSandboxMessage(value: unknown): value is SandboxMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SandboxMessage>;
  return candidate.type === "ide-run-result" && typeof candidate.runId === "string" && Array.isArray(candidate.entries) && candidate.entries.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const item = entry as { level?: unknown; text?: unknown };
    return (item.level === "log" || item.level === "info" || item.level === "warn" || item.level === "error") && typeof item.text === "string";
  });
}

export function useIDE() {
  const [theme, setTheme] = React.useState<IDETheme>("vs-light");
  const [hydrated, setHydrated] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [sidebarWidth, setSidebarWidth] = React.useState(248);
  const [bottomPanelOpen, setBottomPanelOpen] = React.useState(true);
  const [bottomPanelHeight, setBottomPanelHeight] = React.useState(214);
  const [bottomPanel, setBottomPanel] = React.useState<IDEPanel>("console");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [output, setOutput] = React.useState<IDEOutputEntry[]>([]);
  const [lastRunAt, setLastRunAt] = React.useState<string | null>(null);
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const pendingRuns = React.useRef(new Map<string, (entries: IDEOutputEntry[]) => void>());

  React.useEffect(() => {
    let timer = 0;
    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as IDETheme | null;
      const savedChrome = window.localStorage.getItem(CHROME_STORAGE_KEY);
      const parsed = savedChrome ? JSON.parse(savedChrome) as Partial<{ sidebarWidth: number; bottomPanelHeight: number }> : {};
      timer = window.setTimeout(() => {
        if (savedTheme && [
          "vs-light", "github-light", "solarized-light", "material-light",
        ].includes(savedTheme)) setTheme(savedTheme as IDETheme);
        if (typeof parsed.sidebarWidth === "number") setSidebarWidth(parsed.sidebarWidth);
        if (typeof parsed.bottomPanelHeight === "number") setBottomPanelHeight(parsed.bottomPanelHeight);
        setHydrated(true);
      }, 0);
    } catch {
      // Local storage is optional.
    }
    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    try {
      if (!hydrated) return;
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Local storage is optional.
    }
  }, [hydrated, theme]);

  React.useEffect(() => {
    try {
      if (!hydrated) return;
      window.localStorage.setItem(CHROME_STORAGE_KEY, JSON.stringify({ sidebarWidth, bottomPanelHeight }));
    } catch {
      // Local storage is optional.
    }
  }, [bottomPanelHeight, hydrated, sidebarWidth]);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== frameRef.current?.contentWindow || event.origin !== window.location.origin || !isSandboxMessage(event.data)) return;
      const data = event.data;
      const resolve = pendingRuns.current.get(data.runId);
      if (!resolve) return;
      pendingRuns.current.delete(data.runId);
      resolve(data.entries.map((entry, index) => ({
        id: `${data.runId}-${index}`,
        level: entry.level,
        text: entry.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      })));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const appendOutput = React.useCallback((entries: IDEOutputEntry[]) => {
    setOutput((current) => [...current, ...entries]);
  }, []);

  const clearOutput = React.useCallback(() => setOutput([]), []);

  const runJavaScript = React.useCallback((source: string) => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) {
      const entry: IDEOutputEntry = { id: crypto.randomUUID(), level: "error", text: "Sandbox is still starting. Try again in a moment.", timestamp: new Date().toLocaleTimeString() };
      appendOutput([entry]);
      return;
    }
    const runId = crypto.randomUUID();
    const promise = new Promise<IDEOutputEntry[]>((resolve) => {
      const timeout = window.setTimeout(() => {
        pendingRuns.current.delete(runId);
        resolve([{ id: `${runId}-timeout`, level: "error", text: "Execution stopped after 3 seconds.", timestamp: new Date().toLocaleTimeString() }]);
      }, 3000);
      pendingRuns.current.set(runId, (entries) => {
        window.clearTimeout(timeout);
        resolve(entries);
      });
    });
    frame.contentWindow.postMessage({ type: "ide-run", runId, source }, "*");
    void promise.then((entries) => {
      appendOutput(entries.length > 0 ? entries : [{ id: `${runId}-empty`, level: "info", text: "Process exited with code 0.", timestamp: new Date().toLocaleTimeString() }]);
      setLastRunAt(new Date().toISOString());
      setBottomPanel("console");
      setBottomPanelOpen(true);
    });
  }, [appendOutput]);

  return {
    theme,
    setTheme,
    sidebarOpen,
    setSidebarOpen,
    sidebarWidth,
    setSidebarWidth: (value: number) => setSidebarWidth(Math.min(380, Math.max(190, value))),
    bottomPanelOpen,
    setBottomPanelOpen,
     bottomPanelHeight,
     setBottomPanelHeight: (value: number) => setBottomPanelHeight(Math.min(520, Math.max(140, value))),
    bottomPanel,
    setBottomPanel,
    previewOpen,
    setPreviewOpen,
    output,
    clearOutput,
    runJavaScript,
    lastRunAt,
    setFrame: React.useCallback((frame: HTMLIFrameElement | null) => { frameRef.current = frame; }, []),
  };
}
