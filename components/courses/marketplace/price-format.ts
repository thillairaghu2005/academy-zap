/**
 * Marketplace price formatting utility — kept in a separate file so
 * hover-preview.tsx (component) is a pure React module and Vite/
 * react-refresh Fast Refresh can hot-replace component state across edits.
 */

/**
 * Format a price in paise (1/100 of a rupee) as a localized INR string.
 * Example: formatMarketPrice(99900) → "₹999"
 */
export function formatMarketPrice(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}
