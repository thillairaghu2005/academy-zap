"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle, Zap } from "lucide-react";

import { buyNow, getCatalogProduct } from "@/lib/api/commerce";
import { MockApiError } from "@/lib/api/errors";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckoutOutage } from "@/components/commerce/checkout-outage";

/**
 * Shared "Buy now" action (Task 3) — one product straight to a hosted
 * checkout session, bypassing the cart entirely (the mock `buyNow` builds an
 * isolated cart that never touches the user's stored cart).
 *
 *  - Validates stock from the mock inventory; out-of-stock disables the
 *    button and shows an inline note.
 *  - Guards double-submission (disabled while in flight).
 *  - A simulated 503 (CHECKOUT_DEMO_503) swaps the button for the dedicated
 *    outage state with Retry + Return to cart.
 */
export function BuyNowButton({
  productId,
  quantity = 1,
  size = "default",
  className,
  buttonClassName,
}: {
  productId: string;
  quantity?: number;
  size?: "default" | "sm" | "lg";
  className?: string;
  buttonClassName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSession();
  const userId = user?.id ?? "";

  const [outage, setOutage] = React.useState(false);

  const catalogQuery = useQuery({
    queryKey: ["catalog-product", productId],
    queryFn: () => getCatalogProduct(productId),
  });
  const product = catalogQuery.data;
  const outOfStock = product ? product.stock < quantity : false;
  const lowStock =
    product && !outOfStock && product.stock > 0 && product.stock <= 3
      ? product.stock
      : 0;

  const mutation = useMutation({
    mutationFn: () => buyNow(userId, productId, quantity),
    onSuccess: (session) => {
      router.push(`/checkout/${session.checkout_id}`);
    },
    onError: (error: Error) => {
      if (error instanceof MockApiError && error.code === "checkout_down") {
        setOutage(true);
        return;
      }
      toast.error(error.message);
    },
  });

  const runBuy = () => {
    setOutage(false);
    mutation.mutate();
  };

  if (outage) {
    return (
      <CheckoutOutage
        onRetry={runBuy}
        retrying={mutation.isPending}
      />
    );
  }

  if (!user) {
    return (
      <Button variant="gradient" size={size} asChild className={cn(className, buttonClassName)}>
        <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
          <Zap className="size-4" />
          Buy now
        </Link>
      </Button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Button
        variant="gradient"
        size={size}
        disabled={outOfStock || mutation.isPending}
        onClick={runBuy}
        className={buttonClassName}
      >
        {mutation.isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Zap className="size-4" />
        )}
        {outOfStock
          ? "Out of stock"
          : mutation.isPending
            ? "Starting checkout…"
            : "Buy now"}
      </Button>
      {outOfStock ? (
        <p className="text-caption font-medium text-rose-700">
          Out of stock — check back later.
        </p>
      ) : lowStock > 0 ? (
        <p className="text-caption font-medium text-amber-700">
          Only {lowStock} left in stock.
        </p>
      ) : null}
    </div>
  );
}
