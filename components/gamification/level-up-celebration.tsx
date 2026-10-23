"use client";

import * as React from "react";
import { m as motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LevelUpPayload {
  level?: number;
  rank?: string;
  xp?: number;
}

/** Level-up celebration: a clean rank announcement on the
    `zapsters:level-up` event. */
export function LevelUpCelebration() {
  const [open, setOpen] = React.useState(false);
  const [payload, setPayload] = React.useState<LevelUpPayload>({});

  React.useEffect(() => {
    const onLevelUp = (event: Event) => {
      const detail = (event as CustomEvent<LevelUpPayload>).detail ?? {};
      setPayload(detail);
      setOpen(true);
    };
    window.addEventListener("zapsters:level-up", onLevelUp);
    return () => window.removeEventListener("zapsters:level-up", onLevelUp);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden sm:max-w-sm">
        <div className="relative py-2">
          <DialogHeader className="text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              className="mx-auto flex justify-center"
            >
              <Trophy className="size-10 text-primary" />
            </motion.div>
            <DialogTitle className="mt-4">Level up!</DialogTitle>
            <DialogDescription>
              You reached{" "}
              <span className="font-semibold text-foreground">
                Level {payload.level ?? 1}
              </span>
              {payload.rank ? ` · ${payload.rank}` : ""}
              {typeof payload.xp === "number"
                ? ` · +${payload.xp.toLocaleString()} XP`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
            <Flame className="size-4 text-primary" />
            Your momentum multiplier just grew.
          </div>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => setOpen(false)}>Keep learning</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}