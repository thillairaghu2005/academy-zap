"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { m as motion, AnimatePresence } from "framer-motion";
import { Download, Share2, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY = "zapsters:pwa-dismissed";
const DISMISSAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isIos] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);
    return Boolean(isIosDevice && isSafari);
  });
  const [showIosGuide, setShowIosGuide] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const timestamp = parseInt(stored, 10);
        if (!isNaN(timestamp) && Date.now() - timestamp < DISMISSAL_COOLDOWN_MS) {
          return true;
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
    return false;
  });
  const [isStandalone] = React.useState(() => {
    if (typeof window === "undefined") return true;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });

  React.useEffect(() => {
    if (isStandalone) return;

    // Capture Chromium beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowIosGuide(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // Ignore write errors
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide((prev) => !prev);
    }
  };

  // Do not render if standalone, dismissed, or unsupported browser
  if (isStandalone || dismissed || (!deferredPrompt && !isIos)) {
    return null;
  }

  // Adjust bottom position so it does not collide with mobile bottom navigation bar
  const isLearningCourse = pathname ? /^\/courses\/[^/]+\/learn/.test(pathname) : false;
  const isMarketingOrAuth = pathname === "/" || pathname === "/login" || pathname === "/register" || pathname?.startsWith("/pricing");
  const bottomPositionClass = isLearningCourse || isMarketingOrAuth
    ? "bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]"
    : "bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6";

  return (
    <aside
      role="region"
      aria-label="Install Zapsters app"
      className={cn(
        "fixed inset-x-3 z-40 max-w-md mx-auto sm:right-6 sm:left-auto sm:max-w-sm pointer-events-auto",
        bottomPositionClass,
      )}
    >
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md p-4 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Smartphone className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Install Zapsters App
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fast standalone launch and offline learning
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground shrink-0 -mr-1 -mt-1"
            aria-label="Dismiss install banner"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* iOS Step-by-step guidance */}
        <AnimatePresence>
          {showIosGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground"
            >
              <p className="font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Share2 className="size-3.5 text-primary" /> Install on Safari iOS:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Tap the <span className="font-semibold text-foreground">Share</span> icon in your Safari bottom bar</li>
                <li>Scroll down and tap <span className="font-semibold text-foreground">Add to Home Screen</span></li>
              </ol>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3.5 flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="flex-1 font-medium gap-1.5 shadow-sm"
          >
            <Download className="size-3.5" />
            {isIos ? (showIosGuide ? "Close Instructions" : "How to Install") : "Install Now"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-muted-foreground text-xs"
          >
            Not now
          </Button>
        </div>
      </div>
    </aside>
  );
}
