"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { Cart } from "@/lib/contracts/commerce";
import { getCart } from "@/lib/data/demo/commerce";

export const CART_UPDATED_EVENT = "zapsters:cart-updated";

export function cartQueryKey(userId: string) {
  return ["cart", userId] as const;
}

export function cartItemCount(cart: Pick<Cart, "items"> | null | undefined): number {
  return cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
}

/** The shared cart query used by the page and every navigation surface. */
export function useCartQuery(userId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: cartQueryKey(userId),
    queryFn: () => getCart(userId),
    enabled: Boolean(userId),
  });

  React.useEffect(() => {
    const refresh = (event: Event) => {
      if (
        event.type === "storage" &&
        (event as StorageEvent).key !== "zapsters.mock.cart"
      ) {
        return;
      }
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!detail?.userId || detail.userId === userId) {
        void queryClient.invalidateQueries({ queryKey: cartQueryKey(userId) });
      }
    };

    window.addEventListener(CART_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [queryClient, userId]);

  return query;
}
