/**
 * Syncs monaco-editor's AMD build into `public/vs`.
 *
 * @monaco-editor/react's default loader fetches Monaco from a CDN; we want a
 * fully self-hosted frontend (no runtime CDN dependency, works offline). The
 * AMD build ships its own worker bootstrapping, so we never have to integrate
 * web workers with the bundler (Turbopack cannot resolve monaco's worker
 * entry — see editor-pane.tsx). Monaco's AMD loader requests its workers from
 * the same `vs/` base path, so a plain file copy is all that's needed.
 *
 * Wired as `postinstall` (and `predev`/`prebuild`) in package.json — re-runs
 * automatically when the dependency version changes.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "monaco-editor", "min", "vs");
const dest = join(root, "public", "vs");

if (!existsSync(src)) {
  console.warn("[sync-monaco] monaco-editor not installed yet — skipping.");
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[sync-monaco] copied monaco AMD build -> public/vs`);
