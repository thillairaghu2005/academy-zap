"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";

import { getCart } from "@/lib/data/demo/commerce";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";

/**
 * Live cart badge (Task 2). The count comes from the same ["cart", userId]
 * query every cart mutation invalidates, so it updates immediately from any
 * page. The mock cart store persists to localStorage, so the count survives a
 * full refresh. The pill is HIDDEN entirely when the cart is empty (never a
 * bare "0"), and the link's aria-label conveys the count to screen readers.
 */
export function CartBadge() {
  const { user } = useSession();
  const userId = user?.id ?? "";

  const cartQuery = useQuery({
    queryKey: ["cart", userId],
    queryFn: () => getCart(userId),
    enabled: Boolean(user),
  });

  const count =
    cartQuery.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative text-muted-foreground"
      asChild
      aria-label={count > 0 ? `Cart, ${count} items` : "Cart, empty"}
    >
      <Link href="/cart">
        <ShoppingCart />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-caption font-bold leading-4 text-primary-foreground ring-2 ring-background"
          >
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
