"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  LoaderCircle,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  TriangleAlert,
  Trash2,
} from "lucide-react";

import {
  addToCart,
  createCheckout,
  getCart,
  removeFromCart,
} from "@/lib/api/commerce";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonCard, SkeletonLines } from "@/components/shared/skeletons";

/* ------------------------------------------------------------------ */
/*  Cart — items, quantity steppers, and the hosted-checkout CTA.      */
/*                                                                    */
/*  The checkout step never collects card data: it creates a           */
/*  CheckoutSession (create_checkout) and hands the user to the        */
/*  provider's hosted page. PCI scope stays with Razorpay/Stripe.      */
/* ------------------------------------------------------------------ */

export function CartClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? "";

  const cartQuery = useQuery({
    queryKey: ["cart", userId],
    queryFn: () => getCart(userId),
    enabled: Boolean(user),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["cart", userId] });

  const qtyMutation = useMutation({
    mutationFn: ({ productId, delta }: { productId: string; delta: number }) =>
      addToCart(userId, productId, delta),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromCart(userId, productId),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => createCheckout(userId),
    onSuccess: (session) => router.push(`/checkout/${session.checkout_id}`),
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  /* ---------- Signed out ---------- */
  if (!user) {
    return (
      <PageContainer narrow>
        <EmptyState
          icon={ShoppingCart}
          title="Sign in to see your cart"
          description="Your cart lives with your account. Sign in to review items and check out."
          action={
            <Button variant="gradient" asChild>
              <Link href={`/login?next=/cart`}>Sign in</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  /* ---------- Loading ---------- */
  if (cartQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonLines count={1} className="max-w-md" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonCard className="h-56" />
        </div>
      </PageContainer>
    );
  }

  /* ---------- Error ---------- */
  if (cartQuery.isError || !cartQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title="Couldn't load your cart"
          message={
            cartQuery.error instanceof Error
              ? cartQuery.error.message
              : "The cart service is not responding."
          }
          code="CART_ERR"
          onRetry={() => cartQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const cart = cartQuery.data;

  /* ---------- Empty ---------- */
  if (cart.items.length === 0) {
    return (
      <PageContainer>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Your cart
        </h1>
        <div className="mt-6">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Paid courses and lab passes land here. Free courses enroll directly from the catalog."
            action={
              <Button variant="gradient" asChild>
                <Link href="/courses">
                  Browse courses
                  <ArrowRight />
                </Link>
              </Button>
            }
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Your cart
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cart.items.reduce((n, i) => n + i.quantity, 0)} item
            {cart.items.reduce((n, i) => n + i.quantity, 0) === 1 ? "" : "s"} ·
            payment handled by a hosted provider page
          </p>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        {/* Item list */}
        <div className="flex flex-col gap-3">
          {cart.items.map((item) => (
            <Card key={item.product_id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-lg",
                    item.kind === "lab"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {item.kind === "lab" ? (
                    <FlaskConical className="size-5" />
                  ) : (
                    <BookOpen className="size-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {item.kind === "lab" ? "Lab pass" : "Course"}
                    </Badge>
                    <p className="truncate text-sm font-medium">
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatMoney(item.unit_price_cents)} each
                  </p>
                </div>

                {/* Qty stepper */}
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Decrease quantity of ${item.title}`}
                    disabled={qtyMutation.isPending}
                    onClick={() =>
                      item.quantity === 1
                        ? removeMutation.mutate(item.product_id)
                        : qtyMutation.mutate({
                            productId: item.product_id,
                            delta: -1,
                          })
                    }
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-6 text-center font-mono text-sm">
                    {item.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Increase quantity of ${item.title}`}
                    disabled={qtyMutation.isPending || item.quantity >= 9}
                    onClick={() =>
                      qtyMutation.mutate({
                        productId: item.product_id,
                        delta: 1,
                      })
                    }
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>

                <p className="w-20 text-right font-display text-sm font-semibold">
                  {formatMoney(item.unit_price_cents * item.quantity)}
                </p>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${item.title} from cart`}
                  onClick={() => removeMutation.mutate(item.product_id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              <p className="font-display text-sm font-semibold">Summary</p>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">
                  {formatMoney(cart.total_cents)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="font-medium">Total</span>
                <span className="font-display text-xl font-bold">
                  {formatMoney(cart.total_cents)}
                </span>
              </div>

              <Button
                variant="gradient"
                className="w-full"
                disabled={checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate()}
              >
                {checkoutMutation.isPending ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Creating checkout…
                  </>
                ) : (
                  <>
                    Checkout securely
                    <ArrowRight />
                  </>
                )}
              </Button>

              {checkoutMutation.isError ? (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  <div className="flex flex-col gap-1">
                    <span>
                      {checkoutMutation.error instanceof Error
                        ? checkoutMutation.error.message
                        : "Checkout failed."}
                    </span>
                    <button
                      className="text-left font-medium underline underline-offset-2"
                      onClick={() => removeMutation.mutate("course-boom")}
                    >
                      Remove the outage product and retry
                    </button>
                  </div>
                </div>
              ) : null}

              <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <ShieldCheck className="size-3.5 shrink-0 text-emerald-500" />
                Payment happens on the provider&apos;s hosted page — Zapsters
                never touches card numbers (PCI scope stays with Razorpay /
                Stripe).
              </p>
            </CardContent>
          </Card>

          {/* Demo hooks — reachable edge states for the checkout flow */}
          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-2 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Demo states
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={qtyMutation.isPending}
                  onClick={() => {
                    addToCart(userId, "course-boom", 1)
                      .then(() =>
                        toast.info(
                          "Outage product added — hit “Checkout securely” to see the 503 state.",
                        ),
                      )
                      .catch((e: Error) => toast.error(e.message));
                  }}
                >
                  <TriangleAlert className="size-3.5" />
                  Simulate provider outage
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/checkout/cs-expired-demo">Expired session</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/checkout/cs-fail-demo">Declined payment</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/checkout/cs-paid-demo">Already paid</Link>
                </Button>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="size-3 shrink-0" />
                Deterministic mock ids so every state is demoable.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
