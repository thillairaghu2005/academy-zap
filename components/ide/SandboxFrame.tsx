"use client";

import * as React from "react";

import { SANDBOX_DOCUMENT } from "@/hooks/useIDE";
import styles from "./ide.module.css";

export function SandboxFrame({ onReady }: { onReady: (frame: HTMLIFrameElement | null) => void }) {
  const attach = React.useCallback((frame: HTMLIFrameElement | null) => onReady(frame), [onReady]);
  return <iframe ref={attach} className={styles.sandboxFrame} title="JavaScript execution sandbox" sandbox="allow-scripts" srcDoc={SANDBOX_DOCUMENT} />;
}
