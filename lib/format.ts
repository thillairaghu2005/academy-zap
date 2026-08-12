/**
 * Display-only formatting helpers (F6). These are presentation helpers only —
 * every authoritative number (prices, totals, balances) comes from the mock
 * API; the client never derives amounts, it only formats them.
 */

/** Minor units (cents/paise) → an INR-formatted display string. */
export function formatMoney(cents: number, currency = "inr"): string {
  const amount = cents / 100;
  const formatted = amount.toLocaleString(currency.toLowerCase() === "inr" ? "en-IN" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
  return formatted;
}
