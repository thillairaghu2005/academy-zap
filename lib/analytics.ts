import { trackDemoEvent } from "@/lib/demo/analytics";

/**
 * Optional Google Analytics 4 wiring.
 *
 * Nothing loads unless BOTH are true:
 *  1. NEXT_PUBLIC_GA_ID is configured at build time (absent by default), and
 *  2. the visitor accepted non-essential cookies ("all") in the consent banner.
 *
 * The consent choice lives in localStorage and the cookie banner dispatches a
 * `zapsters:consent` window event whenever it is granted, which triggers the
 * deferred load below.
 */

export const CONSENT_EVENT = "zapsters:consent";
export const CONSENT_RESET_EVENT = "zapsters:consent-reset";
export const CONSENT_STORAGE_KEY = "zapsters-cookie-consent";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

function hasFullConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === "all";
  } catch {
    return false;
  }
}

let loadStarted = false;

function loadGa(): void {
  if (!GA_ID || loadStarted || typeof window === "undefined") return;
  loadStarted = true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  } as Gtag;
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

/** Mounted once from the root layout; loads GA only after full consent. */
export function initAnalytics(): void {
  if (!GA_ID || typeof window === "undefined") return;
  if (hasFullConsent()) loadGa();
  window.addEventListener(CONSENT_EVENT, () => {
    if (hasFullConsent()) loadGa();
  });
}

/**
 * Track a meaningful product event. Mirrors into the first-party demo event
 * log (which powers in-app statistics) and forwards to GA4 when loaded.
 * Never include form contents or personal data in `params`.
 */
export function trackEvent(name: string, params?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return;
  trackDemoEvent(name, params);
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params ?? {});
  }
}

/** Convenience wrapper for primary-CTA / conversion interactions. */
export function trackConversion(label: string, source?: string): void {
  trackEvent("cta_click", { label, ...(source ? { source } : {}) });
}
