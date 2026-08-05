"use client";

import Link from "next/link";
import { LoaderCircle, ServerCrash } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Dedicated checkout maintenance state (Task 4). Rendered when a checkout
 * attempt fails with a simulated 503 (CHECKOUT_DEMO_503 or the in-cart
 * outage demo product). Retry re-attempts the checkout; Return to cart
 * leaves the cart untouched.
 */
export function CheckoutOutage({
  onRetry,
  retrying = false,
}: {
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-6 py-8 text-center"
    >
      <div className="grid size-12 place-items-center rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-700">
        <ServerCrash className="size-5" />
      </div>
      <div>
        <h3 className="font-display text-base font-semibold">
          Checkout service is temporarily unavailable.
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
          This is a simulated provider outage (CHECKOUT_DEMO_503). Your cart is
          safe — nothing was charged and no entitlements changed.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onRetry} disabled={retrying}>
          {retrying ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Retry
        </Button>
        <Button variant="outline" asChild>
          <Link href="/cart">Return to cart</Link>
        </Button>
      </div>
    </div>
  );
}
