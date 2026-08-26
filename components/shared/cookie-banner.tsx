"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { motionSprings } from "@/components/motion/motion-tokens";
import { CONSENT_EVENT, CONSENT_RESET_EVENT, CONSENT_STORAGE_KEY } from "@/lib/analytics";

export function CookieBanner() {
  const [show, setShow] = React.useState(false);
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!consent) {
      setTimeout(() => setShow(true), 0);
    }
    const onReset = () => {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      setShow(true);
    };
    window.addEventListener(CONSENT_RESET_EVENT, onReset);
    return () => window.removeEventListener(CONSENT_RESET_EVENT, onReset);
  }, []);

  const saveConsent = (value: "all" | "essential") => {
    localStorage.setItem(CONSENT_STORAGE_KEY, value);
    window.dispatchEvent(new Event(CONSENT_EVENT));
    setShow(false);
  };

  const handleAccept = () => saveConsent("all");

  const handleDecline = () => saveConsent("essential");

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={reducedMotion ? false : { y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
          transition={motionSprings.default}
          className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div
            role="region"
            aria-label="Cookie consent"
            className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-border bg-card p-4 shadow-2xl sm:flex sm:items-center sm:justify-between sm:p-5"
          >
            <div className="pr-8">
              <h2 className="text-sm font-semibold">We value your privacy</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We use essential storage to keep you signed in, and optional analytics only with your consent. Read our{" "}
                <Link href="/legal/privacy" className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:mt-0 sm:flex-row sm:items-center sm:shrink-0">
              <Button variant="outline" size="sm" onClick={handleDecline}>
                Essential only
              </Button>
              <Button variant="default" size="sm" onClick={handleAccept}>
                Accept
              </Button>
            </div>
            <button
              onClick={handleDecline}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              aria-label="Decline optional cookies and close"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
