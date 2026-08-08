import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Official convention: underscore-prefixed names mark "omit this
      // sensitive field" destructuring (e.g. publicAssessment strips
      // _acceptedAnswers / _referenceSolution) and intentionally unused
      // params. Warn-free by design.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Self-hosted monaco AMD build, synced from node_modules by
    // scripts/sync-monaco.mjs — vendored third-party code, not ours.
    "public/vs/**",
  ]),
]);

export default eslintConfig;
