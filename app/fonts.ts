/**
 * Zapsters font definitions — loaded via next/font/google so fonts are
 * self-hosted at build time (zero CDN round-trips, zero layout shift).
 *
 * Each font exposes a CSS variable:
 *   --font-heading  →  Geist  (all headings h1–h6, display, CTAs)
 *   --font-body     →  Inter  (body copy, labels, UI text)
 *
 * These variables are the single source of truth; typography.css and the
 * Tailwind @theme block (--font-sans / --font-display) both reference them.
 */

import { Geist, Inter } from "next/font/google";

export const fontHeading = Geist({
  subsets: ["latin"],
  // Variable font — full weight range available, no weight array needed.
  display: "swap",
  variable: "--font-heading",
  fallback: ["system-ui", "sans-serif"],
});

export const fontBody = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  fallback: ["system-ui", "sans-serif"],
});
