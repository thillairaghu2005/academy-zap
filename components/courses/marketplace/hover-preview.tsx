"use client";

import * as React from "react";
import ReactDOM from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Clock3,
  LoaderCircle,
  ShoppingCart,
  Star,
  Users,
  Zap,
} from "lucide-react";

import type { MarketplaceCourse } from "@/lib/mocks/marketplace";
import { addToCart, buyNow } from "@/lib/data/demo/commerce";
import { enroll } from "@/lib/data/demo/content";
import { useSession } from "@/components/providers/session-provider";
import { cartQueryKey } from "@/components/commerce/cart-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Marketplace hover preview (Udemy-style).
 *
 * Hovering a course card schedules a floating preview panel rendered through
 * a portal at the document root, so it can never be clipped by rails, cards,
 * the sidebar or the viewport. Positioning is computed from the live anchor
 * rectangle: it prefers the right side of the card, flips left near the right
 * edge, clamps vertically, and positions itself once its own height is
 * measured — before first paint, so it never flashes in the wrong spot.
 */

const OPEN_DELAY_MS = 180;
const CLOSE_GRACE_MS = 140;
const VIEWPORT_MARGIN = 12;
const CARD_GAP = 12;
const PREVIEW_WIDTH = 344;

export interface HoverPreviewController {
  /** Call on card mouseenter — schedules the preview to open. */
  schedule: (course: MarketplaceCourse, anchor: HTMLElement) => void;
  /** Call on card mouseleave — closes after a short travel grace period. */
  revoke: () => void;
  /** Close immediately (e.g. the rail scrolled under the cursor). */
  close: () => void;
}

const HoverPreviewContext = React.createContext<HoverPreviewController | null>(null);

export function useCourseHoverPreview(): HoverPreviewController {
  const controller = React.useContext(HoverPreviewContext);
  if (!controller) {
    throw new Error("useCourseHoverPreview must be used inside CourseHoverPreviewProvider");
  }
  return controller;
}

export function CourseHoverPreviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    course: MarketplaceCourse;
    anchor: DOMRect;
  } | null>(null);

  const openTimer = React.useRef<number | null>(null);
  const closeTimer = React.useRef<number | null>(null);
  const openCourseId = React.useRef<string | null>(null);

  const clearOpenTimer = React.useCallback(() => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  const schedule = React.useCallback(
    (course: MarketplaceCourse, anchor: HTMLElement) => {
      // Cancel any pending close so moving between adjacent cards keeps the
      // preview alive without flicker.
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      // Already open (or opening) for this exact card.
      if (openCourseId.current === course.id) return;
      clearOpenTimer();
      openTimer.current = window.setTimeout(() => {
        openTimer.current = null;
        openCourseId.current = course.id;
        setState({ course, anchor: anchor.getBoundingClientRect() });
      }, OPEN_DELAY_MS);
    },
    [clearOpenTimer],
  );

  const revoke = React.useCallback(() => {
    clearOpenTimer();
    if (closeTimer.current === null) {
      closeTimer.current = window.setTimeout(() => {
        closeTimer.current = null;
        openCourseId.current = null;
        setState(null);
      }, CLOSE_GRACE_MS);
    }
  }, [clearOpenTimer]);

  const holdOpen = React.useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const close = React.useCallback(() => {
    clearOpenTimer();
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    openCourseId.current = null;
    setState(null);
  }, [clearOpenTimer]);

  // Any scroll or resize invalidates the anchor geometry — close immediately.
  React.useEffect(() => {
    if (!state) return;
    const close = () => setState(null);
    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener("scroll", close, options);
    window.addEventListener("resize", close, options);
    return () => {
      window.removeEventListener("scroll", close, options);
      window.removeEventListener("resize", close, options);
    };
  }, [state]);

  React.useEffect(() => {
    if (!state) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setState(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state]);

  React.useEffect(
    () => () => {
      if (openTimer.current !== null) window.clearTimeout(openTimer.current);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const controller = React.useMemo(() => ({ schedule, revoke, close }), [schedule, revoke, close]);

  return (
    <HoverPreviewContext.Provider value={controller}>
      {children}
      {state
        ? ReactDOM.createPortal(
            <PreviewPanel
              key={state.course.id}
              course={state.course}
              anchor={state.anchor}
              onMouseEnter={holdOpen}
              onMouseLeave={revoke}
            />,
            document.body,
          )
        : null}
    </HoverPreviewContext.Provider>
  );
}

function PreviewPanel({
  course,
  anchor,
  onMouseEnter,
  onMouseLeave,
}: {
  course: MarketplaceCourse;
  anchor: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = React.useState<{ left: number; top: number } | null>(null);
  const [entered, setEntered] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const width = PREVIEW_WIDTH;
    const height = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = anchor.right + CARD_GAP;
    if (left + width > vw - VIEWPORT_MARGIN) {
      left = anchor.left - CARD_GAP - width;
    }
    if (left < VIEWPORT_MARGIN) {
      // Extremely narrow viewport — overlap the card horizontally rather
      // than overflowing either edge.
      left = Math.min(Math.max(anchor.left, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, vw - VIEWPORT_MARGIN - width));
    }

    let top = anchor.top - 8;
    top = Math.min(top, vh - VIEWPORT_MARGIN - height);
    top = Math.max(top, VIEWPORT_MARGIN);

    setPosition({ left, top });
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [anchor]);

  return ReactDOM.createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={`${course.title} preview`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[80] w-[344px] rounded-2xl border border-border bg-card p-5 shadow-[0_24px_64px_rgb(17_24_39_/_0.18)] transition-[opacity,transform] duration-200 ease-out"
      style={{
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        visibility: position ? "visible" : "hidden",
        opacity: entered ? 1 : 0,
        transform: entered ? "scale(1) translateY(0)" : "scale(0.97) translateY(4px)",
      }}
    >
      <PreviewBody course={course} />
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  Shared preview body                                                */
/* ------------------------------------------------------------------ */

export function PreviewBody({ course }: { course: MarketplaceCourse }) {
  const levelLabel = course.level.charAt(0).toUpperCase() + course.level.slice(1);

  return (
    <div>
      <p className="text-caption font-semibold uppercase tracking-[0.14em] text-primary">
        {course.category} · {course.subcategory}
      </p>
      <h3 className="mt-1.5 font-display text-h3 font-semibold leading-tight tracking-tight text-foreground">
        {course.title}
      </h3>
      <p className="mt-2 line-clamp-3 text-small leading-relaxed text-muted-foreground">
        {course.description}
      </p>

      <p className="mt-2.5 text-caption font-medium text-foreground-secondary">{course.instructor}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        {course.rating > 0 ? (
          <span className="inline-flex items-center gap-1 font-semibold text-warning-strong">
            <Star className="size-3.5 fill-warning-strong text-warning-strong" aria-hidden="true" />
            {course.rating.toFixed(1)}
            <span className="font-normal text-muted-foreground">({course.reviewCount.toLocaleString()})</span>
          </span>
        ) : (
          <span className="font-semibold text-success-strong">New course</span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" aria-hidden="true" />
          {course.studentCount.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="size-3.5" aria-hidden="true" />
          {course.durationHours}h · {levelLabel}
        </span>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-caption font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          What you&apos;ll learn
        </p>
        <ul className="mt-2 space-y-1.5">
          {course.whatYouWillLearn.slice(0, 4).map((item) => (
            <li key={item} className="flex items-start gap-2 text-caption leading-snug text-foreground-secondary">
              <Check className="mt-0.5 size-3.5 shrink-0 text-success-strong" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <PriceDisplay course={course} size="lg" />
        <PreviewCta course={course} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */

export function formatMarketPrice(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}

export function PriceDisplay({
  course,
  size = "md",
}: {
  course: MarketplaceCourse;
  size?: "md" | "lg";
}) {
  if (course.isFree) {
    return (
      <span
        className={cn(
          "font-display font-bold tracking-tight text-success-strong",
          size === "lg" ? "text-h3" : "text-base",
        )}
      >
        FREE
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span
        className={cn(
          "font-display font-bold tracking-tight text-foreground",
          size === "lg" ? "text-h3" : "text-base",
        )}
      >
        {formatMarketPrice(course.priceCents)}
      </span>
      {course.originalPriceCents ? (
        <>
          <span className="text-caption text-muted-foreground line-through">
            {formatMarketPrice(course.originalPriceCents)}
          </span>
          <span className="text-caption font-semibold text-success-strong">{course.discountPercent}% OFF</span>
        </>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Actions (shared by cards and previews)                             */
/* ------------------------------------------------------------------ */

/**
 * One shared action set for cards and previews. Signed-out users are routed
 * to sign-in with a return path (mirrors the commerce buttons' behavior).
 */
export function useCourseActions(course: MarketplaceCourse) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? "";

  const addToCartMutation = useMutation({
    mutationFn: () => addToCart(userId, course.id, 1),
    onSuccess: (cart) => {
      queryClient.setQueryData(cartQueryKey(userId), {
        ...cart,
        items: cart.items.map((item) => ({ ...item })),
      });
      toast.success(`${course.title} added to cart.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const buyNowMutation = useMutation({
    mutationFn: () => buyNow(userId, course.id, 1),
    onSuccess: (session) => {
      router.push(`/checkout/${session.checkout_id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startLearningMutation = useMutation({
    mutationFn: () => enroll(course.id, userId || undefined),
    onSuccess: () => {
      router.push(`/courses/${course.id}/learn`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const signInHere = `/login?next=${encodeURIComponent(pathname)}`;
  const signInForCourse = `/login?next=${encodeURIComponent(`/courses/${course.id}/learn`)}`;

  return {
    userId,
    addToCart: {
      run: () => (user ? addToCartMutation.mutate() : router.push(signInHere)),
      pending: addToCartMutation.isPending,
    },
    buyNow: {
      run: () => (user ? buyNowMutation.mutate() : router.push(signInHere)),
      pending: buyNowMutation.isPending,
    },
    startLearning: {
      run: () => (user ? startLearningMutation.mutate() : router.push(signInForCourse)),
      pending: startLearningMutation.isPending,
    },
  };
}

/** Compact CTA row rendered inside the hover preview. */
export function PreviewCta({ course }: { course: MarketplaceCourse }) {
  const { cartProductIds, enrolledCourseIds } = useMarketplaceState();
  const actions = useCourseActions(course);
  const enrolled = enrolledCourseIds.has(course.id);

  if (course.comingSoon) {
    return (
      <Button size="sm" variant="secondary" disabled>
        Coming soon
      </Button>
    );
  }
  if (enrolled) {
    return (
      <Button size="sm" asChild>
        <Link href={`/courses/${course.id}/learn`}>
          Go to course
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    );
  }
  if (course.isFree) {
    return (
      <Button size="sm" onClick={actions.startLearning.run} disabled={actions.startLearning.pending}>
        {actions.startLearning.pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
        Start learning
      </Button>
    );
  }

  const inCart = cartProductIds.has(course.id);
  if (inCart) {
    return (
      <Button size="sm" variant="secondary" asChild>
        <Link href="/cart">
          <Check className="size-4 text-success-strong" />
          In cart
        </Link>
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={actions.addToCart.run} disabled={actions.addToCart.pending}>
        {actions.addToCart.pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ShoppingCart className="size-4" />
        )}
        Add
      </Button>
      <Button size="sm" onClick={actions.buyNow.run} disabled={actions.buyNow.pending}>
        {actions.buyNow.pending ? <LoaderCircle className="size-4 animate-spin" /> : <Zap className="size-4" />}
        Buy now
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page-level marketplace state (cart + enrollment reads)             */
/* ------------------------------------------------------------------ */

export interface MarketplaceState {
  cartProductIds: Set<string>;
  enrolledCourseIds: Set<string>;
}

const MarketplaceStateContext = React.createContext<MarketplaceState>({
  cartProductIds: new Set(),
  enrolledCourseIds: new Set(),
});

export function MarketplaceStateProvider({
  value,
  children,
}: {
  value: MarketplaceState;
  children: React.ReactNode;
}) {
  return <MarketplaceStateContext.Provider value={value}>{children}</MarketplaceStateContext.Provider>;
}

export function useMarketplaceState(): MarketplaceState {
  return React.useContext(MarketplaceStateContext);
}
