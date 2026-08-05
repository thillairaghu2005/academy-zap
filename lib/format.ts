/**
 * Display-only formatting helpers (F6). These are presentation helpers only —
 * every authoritative number (prices, totals, balances) comes from the mock
 * API; the client never derives amounts, it only formats them.
 */

/** Minor units (cents/paise) → "$1,299" style display string. */
export function formatMoney(cents: number, currency = "usd"): string {
  const amount = cents / 100;
  const formatted = amount.toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
  return formatted;
}
