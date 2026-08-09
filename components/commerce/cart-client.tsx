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
  TicketPercent,
  TriangleAlert,
  Trash2,
  X,
} from "lucide-react";

import {
  addToCart,
  applyCoupon,
  createCheckout,
  getCart,
  listDemoCoupons,
  removeCoupon,
  removeFromCart,
} from "@/lib/data/demo/commerce";
import { MockDataError } from "@/lib/data/demo/errors";
import { formatMoney } from "@/lib/format";
import { DEMO_MODE } from "@/lib/config";
import { CheckoutOutage } from "@/components/commerce/checkout-outage";
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

  const [couponInput, setCouponInput] = React.useState("");
  const couponQuery = useQuery({
    queryKey: ["demo-coupons"],
    queryFn: listDemoCoupons,
  });
  const applyCouponMutation = useMutation({
    mutationFn: (code: string) => applyCoupon(userId, code),
    onSuccess: (result) => {
      setCouponInput("");
      invalidate();
      if (result.applied && result.label) {
        toast.success(`${result.label} applied — ${formatMoney(result.discount_cents)} off.`);
      } else {
        toast.error("That promo code isn't valid in the demo.");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const removeCouponMutation = useMutation({
    mutationFn: () => removeCoupon(userId),
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
        <h1 className="font-display text-h1">
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
        <h1 className="font-display text-h1">
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
                      ? "bg-emerald-500/10 text-emerald-700"
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
                    <Badge variant="outline" className="text-caption">
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

                <p className="w-20 text-right font-display text-small font-semibold">
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
              <p className="font-display text-small font-semibold">Summary</p>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">
                  {formatMoney(
                    cart.items.reduce(
                      (sum, item) => sum + item.unit_price_cents * item.quantity,
                      0,
                    ),
                  )}
                </span>
              </div>

              {/* Demo coupon — promo code simulation (Task 4) */}
              <CouponField
                appliedCode={
                  (cart as { coupon_code?: string | null }).coupon_code ?? null
                }
                discountCents={
                  (cart as { discount_cents?: number }).discount_cents ?? 0
                }
                input={couponInput}
                onInputChange={setCouponInput}
                onApply={() => applyCouponMutation.mutate(couponInput)}
                onRemove={() => removeCouponMutation.mutate()}
                pending={applyCouponMutation.isPending || removeCouponMutation.isPending}
                suggestions={Object.keys(couponQuery.data ?? {})}
              />

              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="font-medium">Total</span>
                <span className="font-display text-h3">
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

              {checkoutMutation.isError ?
                checkoutMutation.error instanceof MockDataError &&
                checkoutMutation.error.code === "checkout_down" ? (
                  /* Simulated outage (Task 4) — dedicated maintenance state */
                  <div className="flex flex-col gap-2">
                    <CheckoutOutage
                      onRetry={() => checkoutMutation.mutate()}
                      retrying={checkoutMutation.isPending}
                    />
                    {DEMO_MODE &&
                    cart.items.some((i) => i.product_id === "course-boom") ? (
                      <button
                        className="self-center text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        onClick={() => removeMutation.mutate("course-boom")}
                      >
                        Remove the outage demo product from your cart to
                        recover
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      {checkoutMutation.error instanceof Error
                        ? checkoutMutation.error.message
                        : "Checkout failed."}
                    </span>
                  </div>
                )
              : null}

              <p className="flex items-center gap-1.5 text-caption leading-relaxed text-muted-foreground">
                <ShieldCheck className="size-3.5 shrink-0 text-emerald-700" />
                Payment happens on the provider&apos;s hosted page — Zapsters
                never touches card numbers (PCI scope stays with Razorpay /
                Stripe).
              </p>
            </CardContent>
          </Card>

          {/* Demo hooks — reachable edge states for the checkout flow.
              Demo scaffolding: gated in production-shaped builds. */}
          {DEMO_MODE ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col gap-2 p-4">
                <p className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
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
                <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <Lock className="size-3 shrink-0" />
                  Deterministic mock ids so every state is demoable.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}

function CouponField({
  appliedCode,
  discountCents,
  input,
  onInputChange,
  onApply,
  onRemove,
  pending,
  suggestions,
}: {
  appliedCode: string | null;
  discountCents: number;
  input: string;
  onInputChange: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
  pending: boolean;
  suggestions: string[];
}) {
  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-success-strong">
          <TicketPercent className="size-3.5 shrink-0" />
          <span className="truncate">{appliedCode}</span>
          <span className="text-muted-foreground">· −{formatMoney(discountCents)}</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label={`Remove coupon ${appliedCode}`}
          className="shrink-0 rounded p-0.5 text-muted-foreground outline-none transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="coupon-code" className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
        <TicketPercent className="size-3.5" />
        Promo code
      </label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onApply();
            }
          }}
          placeholder="Try ZAP10 or HUNT"
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={pending || !input.trim()}
          onClick={onApply}
        >
          {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : "Apply"}
        </Button>
      </div>
      {suggestions.length > 0 ? (
        <p className="text-caption text-muted-foreground">
          Try{" "}
          {suggestions.map((code, index) => (
            <React.Fragment key={code}>
              {index > 0 ? " · " : ""}
              <button
                type="button"
                onClick={() => onInputChange(code)}
                className="rounded font-mono text-xs font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {code}
              </button>
            </React.Fragment>
          ))}
        </p>
      ) : null}
    </div>
  );
}
