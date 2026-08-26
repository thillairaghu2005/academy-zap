"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { motionSprings } from "@/components/motion/motion-tokens";
import { trackConversion } from "@/lib/analytics";

const CONSENT_STORAGE_KEY = "zapsters-cookie-consent";
const CONSENT_EVENT = "zapsters:consent";
const DISMISSAL_KEY = "zapsters-mobile-cta-dismissed";

/**
 * Subtle sticky conversion bar for public marketing surfaces on small
 * screens. Appears only after the visitor scrolls past the hero, yields to
 * the cookie banner until a consent choice exists, and can be dismissed for
 * the session.
 */
export function MobileCtaBar({ label = "Start learning free", href = "/register", analyticsLabel }: { label?: string; href?: string; analyticsLabel?: string }) {
  const [visible, setVisible] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(true);
  const [consentPending, setConsentPending] = React.useState(true);

  React.useEffect(() => {
    // Storage reads and the first scroll check run in a frame callback so the
    // first client render matches SSR exactly; state settles right after.
    const frame = window.requestAnimationFrame(() => {
      let storedDismissal = null;
      try {
        storedDismissal = window.sessionStorage.getItem(DISMISSAL_KEY);
      } catch {
        // Session storage being unavailable should never break the page.
      }
      setDismissed(storedDismissal === "true");
      setConsentPending(!localStorage.getItem(CONSENT_STORAGE_KEY));
      setVisible(window.scrollY > 520);
    });

    const onScroll = () => setVisible(window.scrollY > 520);
    const onConsent = () => setConsentPending(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(CONSENT_EVENT, onConsent);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSAL_KEY, "true");
    } catch {
      // Session storage being unavailable should never break the page.
    }
  };

  const show = visible && !dismissed && !consentPending;
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={motionSprings.default}
          className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          role="complementary"
          aria-label="Quick sign-up"
        >
          <div className="border-t border-border bg-card/95 px-4 py-3 shadow-[0_-4px_16px_rgb(23_23_23_/_6%)] backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Button size="lg" className="h-11 min-h-11 flex-1" asChild>
                <Link href={href} onClick={() => trackConversion("mobile_cta_click", analyticsLabel)}>
                  {label}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                onClick={dismiss}
                aria-label="Dismiss sign-up bar"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
