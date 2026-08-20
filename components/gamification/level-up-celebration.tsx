"use client";

import * as React from "react";
import { m as motion, useReducedMotion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CONFETTI_COLORS = [
  "var(--color-primary)",
  "var(--color-xp-mastery)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-info)",
];

function ConfettiBurst({ burstKey }: { burstKey: number }) {
  const reducedMotion = useReducedMotion() ?? false;
  const pieces = Array.from({ length: 28 }, (_, index) => ({
    angle: (index / 28) * Math.PI * 2 + burstKey,
    distance: 90 + (index % 7) * 34,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    rotate: (index % 5) * 72,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((piece, index) => (
        <motion.span
          key={`${burstKey}-${index}`}
          className="absolute left-1/2 top-1/2 block size-2"
          style={{ backgroundColor: piece.color, borderRadius: index % 3 === 0 ? "9999px" : "2px" }}
          initial={reducedMotion ? false : { x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={
            reducedMotion
              ? { opacity: 0 }
              : {
                  x: Math.cos(piece.angle) * piece.distance,
                  y: Math.sin(piece.angle) * piece.distance,
                  opacity: 0,
                  rotate: piece.rotate * 3,
                }
          }
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}

interface LevelUpPayload {
  level?: number;
  rank?: string;
  xp?: number;
}

/** Level-up celebration (UI §6.1): a confetti burst + rank card on the
    `zapsters:level-up` event, matching the XP flyout pattern. */
export function LevelUpCelebration() {
  const [open, setOpen] = React.useState(false);
  const [burstKey, setBurstKey] = React.useState(0);
  const [payload, setPayload] = React.useState<LevelUpPayload>({});

  React.useEffect(() => {
    const onLevelUp = (event: Event) => {
      const detail = (event as CustomEvent<LevelUpPayload>).detail ?? {};
      setPayload(detail);
      setBurstKey((value) => value + 1);
      setOpen(true);
    };
    window.addEventListener("zapsters:level-up", onLevelUp);
    return () => window.removeEventListener("zapsters:level-up", onLevelUp);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden sm:max-w-sm">
        <ConfettiBurst burstKey={burstKey} />
        <div className="relative">
          <DialogHeader className="text-center">
            <motion.div
              className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-b from-primary-light to-primary-muted text-primary shadow-[0_10px_30px_rgb(180_35_60_/_18%)]"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.4, duration: 0.7 }}
            >
              <Trophy className="size-7" />
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
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <Flame className="size-4 text-warning-strong" />
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