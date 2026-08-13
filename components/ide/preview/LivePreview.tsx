"use client";

import * as React from "react";
import { ExternalLink, Monitor, RefreshCw } from "lucide-react";

import type { IDEFile } from "@/types/ide";
import styles from "../ide.module.css";

function previewDocument(files: IDEFile[]): string {
  const html = files.find((file) => file.path === "index.html")?.content ?? "<main><h1>Preview is ready</h1><p>Add an index.html entry point to render your challenge.</p></main>";
  const { css, javascript } = files.reduce((result, file) => {
    if (file.language === "css") result.css.push(file.content);
    if (file.language === "javascript" || file.language === "typescript") result.javascript.push(file.content);
    return result;
  }, { css: [] as string[], javascript: [] as string[] });
  const cssText = css.join("\n");
  const javascriptText = javascript.join("\n");
  const safeScript = javascriptText.replaceAll("</script>", "<\\/script>");
  return html.replace("</head>", `<style>${cssText}</style></head>`).replace("</body>", `<script>${safeScript}</script></body>`);
}

export function LivePreview({ files }: { files: IDEFile[] }) {
  const [reloadKey, setReloadKey] = React.useState(0);
  const [viewport, setViewport] = React.useState<"responsive" | "375" | "768" | "1440">("responsive");
  const document = React.useMemo(() => previewDocument(files), [files]);
  const width = viewport === "responsive" ? "100%" : `${viewport}px`;

  const openNewTab = () => {
    const blob = new Blob([document], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
  };

  return (
    <div className={styles.livePreview} aria-label="Live preview">
      <div className={styles.previewBrowserBar}>
        <span className={styles.previewTrafficLights}><i /><i /><i /></span>
        <span className={styles.previewNavButton} aria-hidden="true">‹</span>
        <span className={styles.previewNavButton} aria-hidden="true">›</span>
        <button type="button" className={styles.previewReload} onClick={() => setReloadKey((current) => current + 1)} aria-label="Reload live preview"><RefreshCw size={13} /></button>
        <span className={styles.previewAddress}>sandbox://challenge.local</span>
        <button type="button" className={styles.previewExternal} onClick={openNewTab} aria-label="Open preview in a new tab"><ExternalLink size={13} /></button>
      </div>
      <div className={styles.previewToolbar}><span><Monitor size={13} /> Viewport</span>{(["responsive", "375", "768", "1440"] as const).map((size) => <button type="button" key={size} className={viewport === size ? styles.previewViewportActive : ""} onClick={() => setViewport(size)} aria-pressed={viewport === size}>{size === "responsive" ? "Responsive" : `${size}px`}</button>)}</div>
      <div className={styles.previewDocument}><iframe key={reloadKey} title="Challenge live preview" className={styles.previewFrame} style={{ width }} srcDoc={document} sandbox="allow-scripts" /></div>
    </div>
  );
}
