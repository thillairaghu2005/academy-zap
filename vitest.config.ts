import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest config for the mock-layer logic tests (audit Track A2).
 *
 * Pure-Node environment: we test the server-shaped mock API modules —
 * session HMAC signing, the support-ticket state machine, the admin
 * review workflow, and the gamification hash chain — so no DOM/jsdom is
 * needed. The `@` alias mirrors tsconfig.json's paths.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // Mock API calls carry artificial network latency (delay + jitter) —
    // give multi-step workflow tests room to breathe.
    testTimeout: 20_000,
  },
});
