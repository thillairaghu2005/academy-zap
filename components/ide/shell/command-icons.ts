import { Play, RotateCcw, Settings2, SquareTerminal, WandSparkles } from "lucide-react";

/**
 * Icon lookup for command palette actions — kept in a separate file so
 * CommandPalette.tsx (component) is a pure React module and Vite/
 * react-refresh Fast Refresh can hot-replace palette state across edits.
 */
export const COMMAND_ICONS = {
  run: Play,
  submit: WandSparkles,
  reset: RotateCcw,
  settings: Settings2,
  panel: SquareTerminal,
};
