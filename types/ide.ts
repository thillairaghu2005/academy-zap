export type IDEFileKind = "file" | "folder";

export type IDELanguage =
  | "html"
  | "css"
  | "javascript"
  | "typescript"
  | "json"
  | "markdown"
  | "python"
  | "java"
  | "c"
  | "cpp"
  | "go"
  | "rust"
  | "sql"
  | "yaml"
  | "xml"
  | "shell";

export type IDETheme =
  | "vs-dark"
  | "vs-light"
  | "github-dark"
  | "github-light"
  | "one-dark-pro"
  | "dracula"
  | "monokai"
  | "solarized-dark"
  | "solarized-light"
  | "nord"
  | "material-dark"
  | "material-light";

export type IDEPanel = "console" | "output" | "problems" | "terminal" | "preview";

export interface IDEFile {
  path: string;
  name: string;
  kind: IDEFileKind;
  language: IDELanguage | "plaintext";
  content: string;
  dirty: boolean;
  order: number;
}

export interface IDEThemeChrome {
  background: string;
  foreground: string;
  muted: string;
  border: string;
  panel: string;
  active: string;
  accent: string;
  accentSoft: string;
  success: string;
}

export interface IDESettings {
  wordWrap: boolean;
  minimap: boolean;
  fontSize: number;
}

export interface IDEOutputEntry {
  id: string;
  level: "log" | "info" | "warn" | "error";
  text: string;
  timestamp: string;
}

export interface IDEProblem {
  message: string;
  severity: "error" | "warning" | "info";
  file?: string;
  line?: number;
}

export interface IDEFileTreeNode {
  name: string;
  path: string;
  kind: IDEFileKind;
  file?: IDEFile;
  children: IDEFileTreeNode[];
}
