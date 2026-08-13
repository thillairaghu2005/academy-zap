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

const LOCAL_DATE_FORMATTER = new Intl.DateTimeFormat();
const LOCAL_DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: "numeric", month: "numeric", day: "numeric",
  hour: "numeric", minute: "numeric", second: "numeric",
});
const LOCAL_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric", minute: "numeric", second: "numeric",
});
const LOCAL_TIME_MINUTE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit", minute: "2-digit",
});
const SHORT_MONTH_DAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric",
});
const SUPPORT_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
});
const US_DATE_FORMATTER = new Intl.DateTimeFormat("en-US");
const LONG_ENGLISH_DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  year: "numeric", month: "long", day: "numeric",
});
const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });
const NOTIFICATION_TIME_FORMATTER = new Intl.DateTimeFormat("en", {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});

export function formatLocalDate(value: string | Date): string {
  return LOCAL_DATE_FORMATTER.format(new Date(value));
}

export function formatLocalDateTime(value: string | Date): string {
  return LOCAL_DATE_TIME_FORMATTER.format(new Date(value));
}

export function formatLocalTime(value: string | Date): string {
  return LOCAL_TIME_FORMATTER.format(new Date(value));
}

export function formatLocalTimeMinutes(value: string | Date): string {
  return LOCAL_TIME_MINUTE_FORMATTER.format(new Date(value));
}

export function formatShortMonthDay(value: string | Date): string {
  return SHORT_MONTH_DAY_FORMATTER.format(new Date(value));
}

export function formatSupportDateTime(value: string | Date): string {
  return SUPPORT_DATE_TIME_FORMATTER.format(new Date(value));
}

export function formatUsDate(value: string | Date): string {
  return US_DATE_FORMATTER.format(new Date(value));
}

export function formatLongEnglishDate(value: string | Date): string {
  return LONG_ENGLISH_DATE_FORMATTER.format(new Date(value));
}

export function formatRelativeLocalDate(base: string, daysAgo: number): string {
  const date = new Date(base);
  date.setDate(date.getDate() - daysAgo);
  return formatLocalDate(date);
}

export function formatReviewDate(value: string | Date): string {
  return REVIEW_DATE_FORMATTER.format(new Date(value));
}

export function formatNotificationTime(value: string | Date): string {
  return NOTIFICATION_TIME_FORMATTER.format(new Date(value));
}
