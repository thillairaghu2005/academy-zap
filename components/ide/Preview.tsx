"use client";

import * as React from "react";
import { ExternalLink, Maximize2, RefreshCw, Smartphone, Tablet, Monitor } from "lucide-react";

import type { IDEFile } from "@/types/ide";
import styles from "./ide.module.css";

interface PreviewProps { files: IDEFile[]; onClose: () => void }

function previewDocument(files: IDEFile[]): string {
  const html = files.find((file) => file.path === "index.html")?.content ?? "<main><h1>Your preview starts here</h1><p>Add an index.html file to begin.</p></main>";
  const css = files.filter((file) => file.language === "css").map((file) => file.content).join("\n");
  const js = files.filter((file) => file.language === "javascript" && file.path !== "script.js").map((file) => file.content).join("\n");
  const script = files.find((file) => file.path === "script.js")?.content ?? js;
  return html.replace("</head>", `<style>${css}</style></head>`).replace("</body>", `<script>${script.replaceAll("</script>", "<\\/script>")}</script></body>`);
}

export function Preview({ files, onClose }: PreviewProps) {
  const [key, setKey] = React.useState(0);
  const [width, setWidth] = React.useState<"phone" | "tablet" | "desktop">("desktop");
  const document = React.useMemo(() => previewDocument(files), [files]);
  const openNewTab = () => {
    const blob = new Blob([document], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
  };
  return (
    <aside className={`${styles.previewPane} ${styles[`preview${width.charAt(0).toUpperCase()}${width.slice(1)}`]}`} aria-label="Live preview">
      <div className={styles.previewHeader}><div><span className={styles.previewDot} /><strong>Live Preview</strong><span className={styles.previewUrl}>localhost:3000</span></div><div className={styles.previewActions}><button onClick={() => setWidth("phone")} className={width === "phone" ? styles.previewActive : ""} aria-label="Phone preview"><Smartphone size={14} /></button><button onClick={() => setWidth("tablet")} className={width === "tablet" ? styles.previewActive : ""} aria-label="Tablet preview"><Tablet size={14} /></button><button onClick={() => setWidth("desktop")} className={width === "desktop" ? styles.previewActive : ""} aria-label="Desktop preview"><Monitor size={14} /></button><button onClick={() => setKey((current) => current + 1)} aria-label="Reload preview"><RefreshCw size={14} /></button><button onClick={openNewTab} aria-label="Open preview in new tab"><ExternalLink size={14} /></button><button onClick={onClose} aria-label="Close preview"><Maximize2 size={14} /></button></div></div>
      <div className={styles.previewFrameWrap}><iframe key={key} title="HTML live preview" className={styles.previewFrame} srcDoc={document} /></div>
    </aside>
  );
}
