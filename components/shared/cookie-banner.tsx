"use client";

import * as React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";

export function CookieBanner() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const consent = localStorage.getItem("zapsters-cookie-consent");
    if (!consent) {
      setTimeout(() => setShow(true), 0);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("zapsters-cookie-consent", "all");
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem("zapsters-cookie-consent", "essential");
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none"
      >
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-4 shadow-2xl pointer-events-auto sm:flex sm:items-center sm:justify-between sm:p-5">
          <div className="pr-8">
            <h2 className="text-sm font-semibold">We value your privacy</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking &quot;Accept&quot;, you consent to our use of cookies.
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
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground sm:right-5 sm:top-5"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
