"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { motionSprings } from "@/components/motion/motion-tokens";
import { cn } from "@/lib/utils";

export function BackToTop() {
  const [visible, setVisible] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const isLearningCourse = pathname ? /^\/courses\/[^/]+\/learn/.test(pathname) : false;
  const isMarketing = !pathname || pathname === "/" || pathname.startsWith("/pricing") || pathname.startsWith("/faq") || pathname.startsWith("/legal");
  const hasBottomNav = !isMarketing && !isLearningCourse;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={motionSprings.fast}
          className={cn(
            "fixed z-40 transition-all duration-200",
            hasBottomNav
              ? "left-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:left-auto sm:right-28 sm:bottom-6"
              : "right-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:right-6 sm:bottom-6",
          )}
        >
          <Button
            variant="default"
            size="icon"
            className="rounded-full shadow-lg"
            onClick={scrollToTop}
            aria-label="Back to top"
          >
            <ArrowUp className="size-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
