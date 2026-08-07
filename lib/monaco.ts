import type { editor } from "monaco-editor";

import type { IDETheme } from "@/types/ide";

export const MONACO_THEME_NAMES: Record<IDETheme, string> = {
  "zapsters-ide-dark": "zapsters-ide-dark",
  "vs-dark": "ide-vs-dark",
  "vs-light": "ide-vs-light",
  "github-dark": "ide-github-dark",
  "github-light": "ide-github-light",
  "one-dark-pro": "ide-one-dark-pro",
  dracula: "ide-dracula",
  monokai: "ide-monokai",
  "solarized-dark": "ide-solarized-dark",
  "solarized-light": "ide-solarized-light",
  nord: "ide-nord",
  "material-dark": "ide-material-dark",
  "material-light": "ide-material-light",
};

const darkRules: editor.IStandaloneThemeData["rules"] = [
  { token: "comment", foreground: "5F708C", fontStyle: "italic" },
  { token: "keyword", foreground: "7FB2FF" },
  { token: "string", foreground: "7DD3A0" },
  { token: "number", foreground: "FBBF24" },
  { token: "type", foreground: "67D3F0" },
  { token: "function", foreground: "F0D48A" },
  { token: "variable", foreground: "E8EFFA" },
];

const lightRules: editor.IStandaloneThemeData["rules"] = [
  { token: "comment", foreground: "008000" },
  { token: "keyword", foreground: "AF00DB" },
  { token: "string", foreground: "A31515" },
  { token: "number", foreground: "098658" },
  { token: "type", foreground: "267F99" },
  { token: "function", foreground: "795E26" },
];

interface ThemeDefinition {
  base: "vs" | "vs-dark" | "hc-black";
  inherit: boolean;
  colors: Record<string, string>;
  rules: editor.IStandaloneThemeData["rules"];
}

const darkColors = (background: string, foreground: string, active: string) => ({
  "editor.background": background,
  "editor.foreground": foreground,
  "editorLineNumber.foreground": "5A6575",
  "editorLineNumber.activeForeground": foreground,
  "editorCursor.foreground": "AEAFAD",
  "editor.selectionBackground": active,
  "editor.inactiveSelectionBackground": `${active}99`,
  "editorIndentGuide.background1": "2A3038",
  "editorIndentGuide.activeBackground1": "454C56",
  "editorWidget.background": background,
  "editorSuggestWidget.background": background,
  "editorSuggestWidget.border": "3A424E",
  "editorHoverWidget.background": background,
  "editorHoverWidget.border": "3A424E",
  "editorBracketMatch.background": `${active}66`,
  "editorBracketMatch.border": "7D8590",
  "editorGutter.background": background,
  "minimap.background": background,
  "scrollbarSlider.background": "4F596666",
  "scrollbarSlider.hoverBackground": "69758699",
});

const lightColors = (background: string, foreground: string, active: string) => ({
  "editor.background": background,
  "editor.foreground": foreground,
  "editorLineNumber.foreground": "9DA5B4",
  "editorLineNumber.activeForeground": foreground,
  "editorCursor.foreground": "333333",
  "editor.selectionBackground": active,
  "editor.inactiveSelectionBackground": `${active}99`,
  "editorIndentGuide.background1": "E5E7EB",
  "editorIndentGuide.activeBackground1": "CBD5E1",
  "editorWidget.background": background,
  "editorSuggestWidget.background": background,
  "editorSuggestWidget.border": "D1D5DB",
  "editorHoverWidget.background": background,
  "editorHoverWidget.border": "D1D5DB",
  "editorBracketMatch.background": `${active}55`,
  "editorBracketMatch.border": "64748B",
  "editorGutter.background": background,
  "minimap.background": background,
  "scrollbarSlider.background": "94A3B866",
  "scrollbarSlider.hoverBackground": "64748B99",
});

export const MONACO_THEMES: Record<IDETheme, ThemeDefinition> = {
  "zapsters-ide-dark": {
    // Kept as an internal persisted-key alias; the product-facing editor is light-only.
    base: "vs",
    inherit: true,
    colors: {
      "editor.background": "#FFFFFF",
      "editor.foreground": "#111827",
      "editorCursor.foreground": "#2563EB",
      "editor.selectionBackground": "rgba(37,99,235,0.12)",
      "editor.inactiveSelectionBackground": "rgba(37,99,235,0.08)",
      "editor.lineHighlightBackground": "rgba(37,99,235,0.035)",
      "editor.lineHighlightBorder": "transparent",
      "editorLineNumber.foreground": "#9CA3AF",
      "editorLineNumber.activeForeground": "#111827",
      "editorIndentGuide.background1": "#E5E7EB",
      "editorIndentGuide.activeBackground1": "#CBD5E1",
      "editorGutter.background": "#FFFFFF",
      "editorWidget.background": "#F5F7FA",
      "editorWidget.border": "#E5E7EB",
      "editorSuggestWidget.background": "#F5F7FA",
      "editorSuggestWidget.selectedBackground": "rgba(37,99,235,0.09)",
      "editorSuggestWidget.border": "#E5E7EB",
      "editorHoverWidget.background": "#F5F7FA",
      "editorHoverWidget.border": "#E5E7EB",
      "editorBracketHighlight.foreground1": "#2563EB",
      "editorBracketHighlight.foreground2": "#0284C7",
      "editorBracketHighlight.foreground3": "#1D4ED8",
      "editorError.foreground": "#B91C1C",
      "editorWarning.foreground": "#B45309",
      "scrollbarSlider.background": "rgba(107,114,128,0.18)",
      "scrollbarSlider.hoverBackground": "rgba(107,114,128,0.28)",
      "minimap.background": "#FFFFFF",
    },
    rules: lightRules,
  },
  "vs-dark": { base: "vs-dark", inherit: true, colors: { ...darkColors("0B1120", "E8EEFA", "253957"), "editorLineNumber.foreground": "52617A", "editorLineNumber.activeForeground": "8EE6BF", "editorCursor.foreground": "8EE6BF", "editorIndentGuide.background1": "17233A", "editorIndentGuide.activeBackground1": "2D4161" }, rules: darkRules },
  "vs-light": { base: "vs", inherit: true, colors: lightColors("FFFFFF", "111827", "DCE9FF"), rules: lightRules },
  "github-dark": { base: "vs-dark", inherit: true, colors: darkColors("0D1117", "E6EDF3", "1F3A5F"), rules: [{ token: "comment", foreground: "8B949E" }, { token: "keyword", foreground: "FF7B72" }, { token: "string", foreground: "A5D6FF" }, { token: "type", foreground: "79C0FF" }] },
  "github-light": { base: "vs", inherit: true, colors: lightColors("FFFFFF", "24292F", "B6D7FF"), rules: [{ token: "comment", foreground: "6E7781" }, { token: "keyword", foreground: "CF222E" }, { token: "string", foreground: "0A3069" }, { token: "type", foreground: "8250DF" }] },
  "one-dark-pro": { base: "vs-dark", inherit: true, colors: darkColors("282C34", "ABB2BF", "3E4451"), rules: [{ token: "comment", foreground: "7F848E" }, { token: "keyword", foreground: "C678DD" }, { token: "string", foreground: "98C379" }, { token: "type", foreground: "E5C07B" }] },
  dracula: { base: "vs-dark", inherit: true, colors: darkColors("282A36", "F8F8F2", "44475A"), rules: [{ token: "comment", foreground: "6272A4" }, { token: "keyword", foreground: "FF79C6" }, { token: "string", foreground: "F1FA8C" }, { token: "type", foreground: "8BE9FD" }] },
  monokai: { base: "vs-dark", inherit: true, colors: darkColors("272822", "F8F8F2", "49483E"), rules: [{ token: "comment", foreground: "75715E" }, { token: "keyword", foreground: "F92672" }, { token: "string", foreground: "E6DB74" }, { token: "type", foreground: "66D9EF" }] },
  "solarized-dark": { base: "vs-dark", inherit: true, colors: darkColors("002B36", "839496", "073642"), rules: [{ token: "comment", foreground: "586E75" }, { token: "keyword", foreground: "859900" }, { token: "string", foreground: "2AA198" }, { token: "type", foreground: "B58900" }] },
  "solarized-light": { base: "vs", inherit: true, colors: lightColors("FDF6E3", "657B83", "EEE8D5"), rules: [{ token: "comment", foreground: "93A1A1" }, { token: "keyword", foreground: "859900" }, { token: "string", foreground: "2AA198" }, { token: "type", foreground: "B58900" }] },
  nord: { base: "vs-dark", inherit: true, colors: darkColors("2E3440", "D8DEE9", "434C5E"), rules: [{ token: "comment", foreground: "616E88" }, { token: "keyword", foreground: "81A1C1" }, { token: "string", foreground: "A3BE8C" }, { token: "type", foreground: "8FBCBB" }] },
  "material-dark": { base: "vs-dark", inherit: true, colors: darkColors("263238", "EEFFFF", "37474F"), rules: [{ token: "comment", foreground: "546E7A" }, { token: "keyword", foreground: "C792EA" }, { token: "string", foreground: "C3E88D" }, { token: "type", foreground: "FFCB6B" }] },
  "material-light": { base: "vs", inherit: true, colors: lightColors("FAFAFA", "37474F", "D7EAF7"), rules: [{ token: "comment", foreground: "90A4AE" }, { token: "keyword", foreground: "7C4DFF" }, { token: "string", foreground: "91B859" }, { token: "type", foreground: "F76D47" }] },
};

export function registerMonacoThemes(monaco: typeof import("monaco-editor")): void {
  for (const [theme, definition] of Object.entries(MONACO_THEMES) as [IDETheme, ThemeDefinition][]) {
    monaco.editor.defineTheme(MONACO_THEME_NAMES[theme], definition);
  }
}

export function getMonacoThemeName(theme: IDETheme): string {
  return MONACO_THEME_NAMES[theme];
}
