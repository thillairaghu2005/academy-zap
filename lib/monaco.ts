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
  { token: "keyword", foreground: "F87171" },
  { token: "string", foreground: "7DD3A0" },
  { token: "number", foreground: "FBBF24" },
  { token: "type", foreground: "FDA4AF" },
  { token: "function", foreground: "F0D48A" },
  { token: "variable", foreground: "E8EFFA" },
];

const lightRules: editor.IStandaloneThemeData["rules"] = [
  { token: "comment", foreground: "008000" },
  { token: "keyword", foreground: "AF00DB" },
  { token: "string", foreground: "A31515" },
  { token: "number", foreground: "098658" },
  { token: "type", foreground: "9F1239" },
  { token: "function", foreground: "795E26" },
];

interface ThemeDefinition {
  base: "vs" | "vs-dark" | "hc-black";
  inherit: boolean;
  colors: Record<string, string>;
  rules: editor.IStandaloneThemeData["rules"];
}

function monacoColor(value: string): string {
  return value.startsWith("#") ? value : `#${value}`;
}

const darkColors = (background: string, foreground: string, active: string) => ({
  "editor.background": monacoColor(background),
  "editor.foreground": monacoColor(foreground),
  "editorLineNumber.foreground": monacoColor("5A6575"),
  "editorLineNumber.activeForeground": monacoColor(foreground),
  "editorCursor.foreground": monacoColor("AEAFAD"),
  "editor.selectionBackground": monacoColor(active),
  "editor.inactiveSelectionBackground": `${monacoColor(active)}99`,
  "editorIndentGuide.background1": monacoColor("2A3038"),
  "editorIndentGuide.activeBackground1": monacoColor("454C56"),
  "editorWidget.background": monacoColor(background),
  "editorSuggestWidget.background": monacoColor(background),
  "editorSuggestWidget.border": monacoColor("3A424E"),
  "editorHoverWidget.background": monacoColor(background),
  "editorHoverWidget.border": monacoColor("3A424E"),
  "editorBracketMatch.background": `${monacoColor(active)}66`,
  "editorBracketMatch.border": monacoColor("7D8590"),
  "editorGutter.background": monacoColor(background),
  "minimap.background": monacoColor(background),
  "scrollbarSlider.background": monacoColor("4F596666"),
  "scrollbarSlider.hoverBackground": monacoColor("69758699"),
});

const lightColors = (background: string, foreground: string, active: string) => ({
  "editor.background": monacoColor(background),
  "editor.foreground": monacoColor(foreground),
  "editorLineNumber.foreground": monacoColor("9DA5B4"),
  "editorLineNumber.activeForeground": monacoColor(foreground),
  "editorCursor.foreground": monacoColor("333333"),
  "editor.selectionBackground": monacoColor(active),
  "editor.inactiveSelectionBackground": `${monacoColor(active)}99`,
  "editorIndentGuide.background1": monacoColor("E5E7EB"),
  "editorIndentGuide.activeBackground1": monacoColor("CBD5E1"),
  "editorWidget.background": monacoColor(background),
  "editorSuggestWidget.background": monacoColor(background),
  "editorSuggestWidget.border": monacoColor("D1D5DB"),
  "editorHoverWidget.background": monacoColor(background),
  "editorHoverWidget.border": monacoColor("D1D5DB"),
  "editorBracketMatch.background": `${monacoColor(active)}55`,
  "editorBracketMatch.border": monacoColor("64748B"),
  "editorGutter.background": monacoColor(background),
  "minimap.background": monacoColor(background),
  "scrollbarSlider.background": monacoColor("94A3B866"),
  "scrollbarSlider.hoverBackground": monacoColor("64748B99"),
});

export const MONACO_THEMES: Record<IDETheme, ThemeDefinition> = {
  "zapsters-ide-dark": {
    // Kept as an internal persisted-key alias; the product-facing editor is light-only.
    base: "vs",
    inherit: true,
    colors: {
      "editor.background": "#FFFFFF",
      "editor.foreground": "#241313",
      "editorCursor.foreground": "#DC2626",
      "editor.selectionBackground": "#DC26261F",
      "editor.inactiveSelectionBackground": "#DC262614",
      "editor.lineHighlightBackground": "#DC262609",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#9CA3AF",
      "editorLineNumber.activeForeground": "#241313",
      "editorIndentGuide.background1": "#E5E7EB",
      "editorIndentGuide.activeBackground1": "#CBD5E1",
      "editorGutter.background": "#FFFFFF",
      "editorWidget.background": "#F5F7FA",
      "editorWidget.border": "#E5E7EB",
      "editorSuggestWidget.background": "#F5F7FA",
      "editorSuggestWidget.selectedBackground": "#DC262617",
      "editorSuggestWidget.border": "#E5E7EB",
      "editorHoverWidget.background": "#F5F7FA",
      "editorHoverWidget.border": "#E5E7EB",
      "editorBracketHighlight.foreground1": "#DC2626",
      "editorBracketHighlight.foreground2": "#BE123C",
      "editorBracketHighlight.foreground3": "#991B1B",
      "editorError.foreground": "#B91C1C",
      "editorWarning.foreground": "#B45309",
      "scrollbarSlider.background": "#6B72802E",
      "scrollbarSlider.hoverBackground": "#6B728047",
      "minimap.background": "#FFFFFF",
    },
    rules: lightRules,
  },
  "vs-dark": { base: "vs-dark", inherit: true, colors: { ...darkColors("2B0B0B", "FFF1F2", "4B1515"), "editorLineNumber.foreground": "7F5B5B", "editorLineNumber.activeForeground": "FDA4AF", "editorCursor.foreground": "FDA4AF", "editorIndentGuide.background1": "451515", "editorIndentGuide.activeBackground1": "6B2020" }, rules: darkRules },
  "vs-light": { base: "vs", inherit: true, colors: lightColors("FFFFFF", "241313", "FFE4E6"), rules: lightRules },
  "github-dark": { base: "vs-dark", inherit: true, colors: darkColors("0D1117", "FFF1F2", "4B1515"), rules: [{ token: "comment", foreground: "B58F8F" }, { token: "keyword", foreground: "FF7B72" }, { token: "string", foreground: "FDA4AF" }, { token: "type", foreground: "FB7185" }] },
  "github-light": { base: "vs", inherit: true, colors: lightColors("FFFFFF", "241F20", "FFE4E6"), rules: [{ token: "comment", foreground: "7F6B6B" }, { token: "keyword", foreground: "CF222E" }, { token: "string", foreground: "7F1D1D" }, { token: "type", foreground: "BE123C" }] },
  "one-dark-pro": { base: "vs-dark", inherit: true, colors: darkColors("282020", "F8F1F2", "4B3538"), rules: [{ token: "comment", foreground: "A38F91" }, { token: "keyword", foreground: "F472B6" }, { token: "string", foreground: "98C379" }, { token: "type", foreground: "E5C07B" }] },
  dracula: { base: "vs-dark", inherit: true, colors: darkColors("2A2020", "FFF8F2", "5A3030"), rules: [{ token: "comment", foreground: "9F5B5B" }, { token: "keyword", foreground: "FF79C6" }, { token: "string", foreground: "F1FA8C" }, { token: "type", foreground: "FDA4AF" }] },
  monokai: { base: "vs-dark", inherit: true, colors: darkColors("272822", "F8F8F2", "49483E"), rules: [{ token: "comment", foreground: "75715E" }, { token: "keyword", foreground: "F92672" }, { token: "string", foreground: "E6DB74" }, { token: "type", foreground: "66D9EF" }] },
  "solarized-dark": { base: "vs-dark", inherit: true, colors: darkColors("2B1717", "D9C7C7", "4B2525"), rules: [{ token: "comment", foreground: "9F7F7F" }, { token: "keyword", foreground: "D7A83D" }, { token: "string", foreground: "FB7185" }, { token: "type", foreground: "FDA4AF" }] },
  "solarized-light": { base: "vs", inherit: true, colors: lightColors("FFF8F0", "6B5555", "FDE8E8"), rules: [{ token: "comment", foreground: "A38F8F" }, { token: "keyword", foreground: "9A6700" }, { token: "string", foreground: "BE123C" }, { token: "type", foreground: "9F1239" }] },
  nord: { base: "vs-dark", inherit: true, colors: darkColors("302626", "E9DDE0", "583B40"), rules: [{ token: "comment", foreground: "8F777D" }, { token: "keyword", foreground: "FB7185" }, { token: "string", foreground: "A3BE8C" }, { token: "type", foreground: "FDA4AF" }] },
  "material-dark": { base: "vs-dark", inherit: true, colors: darkColors("302626", "FFF1F2", "4B3538"), rules: [{ token: "comment", foreground: "8F777D" }, { token: "keyword", foreground: "F472B6" }, { token: "string", foreground: "C3E88D" }, { token: "type", foreground: "FFCB6B" }] },
  "material-light": { base: "vs", inherit: true, colors: lightColors("FAFAFA", "4B3538", "FDE8E8"), rules: [{ token: "comment", foreground: "8F777D" }, { token: "keyword", foreground: "BE123C" }, { token: "string", foreground: "91B859" }, { token: "type", foreground: "F76D47" }] },
};

export function registerMonacoThemes(monaco: typeof import("monaco-editor")): void {
  for (const [theme, definition] of Object.entries(MONACO_THEMES) as [IDETheme, ThemeDefinition][]) {
    monaco.editor.defineTheme(MONACO_THEME_NAMES[theme], definition);
  }
}

export function getMonacoThemeName(theme: IDETheme): string {
  return MONACO_THEME_NAMES[theme];
}
