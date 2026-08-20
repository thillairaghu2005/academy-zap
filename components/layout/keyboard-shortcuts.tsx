"use client";

import * as React from "react";
import { Keyboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SHORTCUTS = [
  ["Ctrl / Cmd + K", "Open global search"],
  ["?", "Open keyboard shortcuts"],
  ["Esc", "Close dialogs and menus"],
  ["Arrow keys", "Move through command results"],
  ["g d", "Go to dashboard"],
  ["g j", "Go to Judge"],
  ["g l", "Go to Labs"],
  ["Space", "Play / pause a lesson video"],
] as const;

export function KeyboardShortcuts() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let lastKey = "";
    const timer = window.setTimeout(() => {}, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "?") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      // "g then <key>" navigation (dashboard/judge/labs).
      if (event.key.toLowerCase() === "g") {
        lastKey = "g";
        window.setTimeout(() => (lastKey = ""), 800);
        return;
      }
      if (lastKey === "g") {
        const destination =
          event.key.toLowerCase() === "d"
            ? "/dashboard"
            : event.key.toLowerCase() === "j"
              ? "/judge"
              : event.key.toLowerCase() === "l"
                ? "/labs"
                : null;
        if (destination) {
          event.preventDefault();
          lastKey = "";
          window.location.assign(destination);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl border border-border bg-white text-muted-foreground shadow-none hover:border-border-strong hover:bg-secondary hover:text-foreground active:bg-primary-light"
        onClick={() => setOpen(true)}
        aria-label="View keyboard shortcuts"
      >
        <Keyboard className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>Move around Zapsters without leaving your keyboard.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {SHORTCUTS.map(([shortcut, description]) => (
              <div key={shortcut} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-1 px-3 py-3 text-sm">
                <span className="text-muted-foreground">{description}</span>
                <kbd className="shrink-0 rounded-md border border-border bg-card px-2 py-1 font-mono text-xs text-foreground">{shortcut}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
