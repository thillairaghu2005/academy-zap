"use client";

import * as React from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";

import { projectVelocity } from "@/components/motion/motion-tokens";
import { feedback } from "@/lib/feedback";

/** Apple-style progressive resistance (SKILL §9). */
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

interface GestureSheetOptions {
  /** Whether the sheet is currently shown. */
  open: boolean;
  /** Called once the sheet has finished snapping closed. */
  onDismiss: () => void;
  /** Fraction of the sheet height that counts as "closed" on release. */
  closeThreshold?: number;
}

interface DragState {
  pointerId: number;
  startClientY: number;
  startY: number;
  history: Array<{ t: number; y: number }>;
  active: boolean;
}

/**
 * Drag-to-dismiss sheet physics (SKILL §2, §3, §5, §6, §9, §10).
 *
 * - 1:1 tracking with `setPointerCapture`; respects where you grabbed it.
 * - Rubber-band resistance past both boundaries.
 * - Momentum projection on release (exponential-decay form, §6).
 * - Release velocity is handed to the closing spring (§5), and springs always
 *   retarget from the live on-screen value — interruptible mid-flight (§3).
 *
 * Wire it to an element that translates with `style={{ y }}`; put
 * `handleRef`/`handleProps` on a `touch-none` drag handle (the header).
 */
export function useGestureSheet({
  open,
  onDismiss,
  closeThreshold = 0.4,
}: GestureSheetOptions) {
  const reducedMotion = useReducedMotion() ?? false;
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = React.useRef<HTMLDivElement | null>(null);
  const drag = React.useRef<DragState | null>(null);
  const generation = React.useRef(0);
  const onDismissRef = React.useRef(onDismiss);
  React.useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  const y = useMotionValue(0);
  const [height, setHeight] = React.useState(0);

  // Reduced motion: the sheet stays at rest; open/close via the controls.
  React.useEffect(() => {
    if (reducedMotion) y.set(0);
  }, [reducedMotion, y]);

  // Entrance: start from the closed position (already set before paint) and
  // drop in with a critically damped spring. Springs retarget from the live
  // value, so a drag mid-entrance interrupts cleanly (§3).
  React.useLayoutEffect(() => {
    if (!open || reducedMotion) return;
    const h = contentRef.current?.offsetHeight ?? 0;
    setHeight(h);
    y.set(h);
    const frame = requestAnimationFrame(() => {
      ++generation.current;
      void animate(y, 0, { type: "spring", bounce: 0, duration: 0.35 });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, reducedMotion, y]);

  // Track layout changes so the closed position stays accurate while open.
  React.useEffect(() => {
    if (!open) return;
    const node = contentRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setHeight(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, [open]);

  const cancelPending = React.useCallback(() => {
    ++generation.current;
    drag.current = null;
  }, []);

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion || event.button !== 0 || height === 0) return;
      const node = event.currentTarget;
      node.setPointerCapture(event.pointerId);
      drag.current = {
        pointerId: event.pointerId,
        startClientY: event.clientY,
        startY: y.get(),
        history: [{ t: performance.now(), y: y.get() }],
        active: true,
      };
    },
    [height, reducedMotion, y],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      if (!state?.active || event.pointerId !== state.pointerId) return;
      const raw = state.startY + (event.clientY - state.startClientY);
      let next = raw;
      // Pulling down closes; pulling up past the open position also resists.
      if (raw > 0) {
        next = rubberband(raw, height, 0.55);
      } else if (raw < -(height * 0.08)) {
        next = rubberband(raw, height, 0.55);
      }
      y.set(next);
      const t = performance.now();
      state.history = state.history.filter((h) => t - h.t <= 160);
      state.history.push({ t, y: next });
    },
    [height, y],
  );

  const onPointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      if (!state?.active || event.pointerId !== state.pointerId) return;
      drag.current = null;

      let velocity = 0;
      if (state.history.length >= 2) {
        const first = state.history[0];
        const last = state.history[state.history.length - 1];
        if (first && last) {
          const dt = last.t - first.t;
          if (dt > 0) velocity = ((last.y - first.y) / dt) * 1000;
        }
      }

      const current = y.get();
      const projected = current + projectVelocity(velocity);
      const shouldClose = projected > height * closeThreshold;
      const target = shouldClose ? height : 0;
      const gen = ++generation.current;

      void animate(y, target, {
        type: "spring",
        // Bounce only when the gesture itself carried momentum (§4).
        bounce: shouldClose ? 0.2 : 0,
        duration: 0.4,
        velocity,
      }).then(() => {
        if (shouldClose && generation.current === gen) {
          feedback.commit();
          onDismissRef.current();
        }
      });
    },
    [closeThreshold, height, y],
  );

  // Drop any in-flight spring on unmount.
  React.useEffect(() => cancelPending, [cancelPending]);

  return {
    ref: contentRef,
    handleRef,
    y,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: cancelPending,
    } satisfies React.HTMLAttributes<HTMLDivElement>,
  };
}