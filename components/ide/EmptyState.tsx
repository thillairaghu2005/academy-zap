import { FileCode2 } from "lucide-react";

import styles from "./ide.module.css";

export function EmptyState() {
  return <div className={styles.editorEmpty}><FileCode2 size={38} strokeWidth={1.2} /><h2>Open a file to start coding</h2><p>Select a file from the Explorer or create a new one.</p><span>Ctrl+P to open quickly</span></div>;
}
