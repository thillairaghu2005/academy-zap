"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { m as motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FlaskConical,
  Hourglass,
  LoaderCircle,
  Lock,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
  TriangleAlert,
} from "lucide-react";

import type {
  CheckoutSession,
  Entitlement,
  Order,
} from "@/lib/contracts/commerce";
import {
  getCheckout,
  getEntitlements,
  getOrderForCheckout,
  replayWebhook,
  simulatePaymentCompletion,
} from "@/lib/data/demo/commerce";
import { downloadReceipt } from "@/lib/demo/receipts";
import { formatMoney } from "@/lib/format";
import { DEMO_MODE } from "@/lib/config";
import { cartQueryKey } from "@/components/commerce/cart-query";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonCard, SkeletonLines } from "@/components/shared/skeletons";

/* ------------------------------------------------------------------ */
/*  Checkout session — rendered around the HOSTED checkout embed.      */
/*                                                                    */
/*  Hard rule (build.md §2.7 / platform doc §2.3): never render a      */
/*  custom card-number input. The mock "embed" below is the provider-  */
/*  hosted page stand-in (Razorpay sandbox): it carries the order      */
/*  summary and a pay action, but the payment form itself lives with   */
/*  the provider. Swapping in the real sandbox iframe later is a       */
/*  one-field change (checkout_url).                                   */
/*                                                                    */
/*  States: pending (embed) · paid (entitlements granted) · failed     */
/*  (provider decline) · expired · not_found · provider-down (503).    */
/* ------------------------------------------------------------------ */

const PROVIDER_LABEL = "Razorpay";

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [leftMs, setLeftMs] = React.useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, diff);
  });

  React.useEffect(() => {
    const t = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setLeftMs(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (leftMs <= 0) return <span>expired</span>;
  const total = Math.floor(leftMs / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
        <span className="relative inline-flex size-2 rounded-full bg-destructive"></span>
      </span>
      {m}:{s.toString().padStart(2, "0")}
    </span>
  );
}

/* ---------------- Hosted embed mock (pending state) ---------------- */

function HostedEmbed({
  session,
  onPaid,
}: {
  session: CheckoutSession;
  onPaid: (order: Order | null) => void;
}) {
  const queryClient = useQueryClient();
  const payMutation = useMutation({
    mutationFn: () => simulatePaymentCompletion(session.checkout_id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["checkout", session.checkout_id] });
      if (result.duplicated) {
        toast.info("Webhook replay detected — no new charge.");
      }
      onPaid(result.order);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      {/* Provider frame chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <CreditCard className="size-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold tracking-tight">{PROVIDER_LABEL} Checkout</p>
          <p className="text-caption text-muted-foreground/80">
            hosted checkout · sandbox test mode
          </p>
        </div>
        <Badge variant="outline" className="gap-1 text-caption text-muted-foreground">
          <Lock className="size-3" />
          hosted
        </Badge>
      </div>

      {/* Embed body — the provider page content (mock) */}
      <div className="flex flex-col gap-5 p-6">
        <p className="text-sm text-muted-foreground/90 leading-relaxed">
          Paying for{" "}
          <span className="font-medium text-foreground">
            {session.cart.items.length} item
            {session.cart.items.length === 1 ? "" : "s"}
          </span>{" "}
          — {PROVIDER_LABEL} hosts the payment form, Zapsters never sees your
          card details.
        </p>

        <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/20 p-3">
          {session.cart.items.map((item, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={item.product_id}
              className="group flex items-center justify-between gap-3 text-sm rounded-lg p-2.5 transition-colors hover:bg-muted/50"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {item.kind === "lab" ? (
                  <div className="grid size-7 shrink-0 place-items-center rounded-md bg-success/10 text-success-strong group-hover:bg-success/20 transition-colors">
                    <FlaskConical className="size-3.5" />
                  </div>
                ) : (
                  <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <BookOpen className="size-3.5" />
                  </div>
                )}
                <span className="truncate font-medium text-foreground/90 group-hover:text-foreground transition-colors">{item.title}</span>
                {item.quantity > 1 ? (
                  <Badge variant="outline" className="text-caption bg-background/50">
                    ×{item.quantity}
                  </Badge>
                ) : null}
              </span>
              <span className="font-semibold text-foreground/90">
                {formatMoney(
                  item.unit_price_cents * item.quantity,
                  session.currency,
                )}
              </span>
            </motion.div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-border px-2 pt-4 pb-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total</span>
            <span className="font-display text-2xl font-bold">
              {formatMoney(session.amount_cents, session.currency)}
            </span>
          </div>
        </div>

        {/* The provider's pay action — not a card form */}
        <Button
          className="w-full transition-transform hover:scale-[1.02]"
          size="lg"
          disabled={payMutation.isPending}
          onClick={() => payMutation.mutate()}
        >
          {payMutation.isPending ? (
            <>
              <LoaderCircle className="animate-spin" />
              Processing with {PROVIDER_LABEL}…
            </>
          ) : (
            <>
              Pay {formatMoney(session.amount_cents, session.currency)}
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 pt-1 text-caption text-muted-foreground/70">
          <ShieldCheck className="size-3.5 text-success/80" />
          <span>
            PCI-DSS scope stays with {PROVIDER_LABEL} · 3-D Secure applies in test mode
          </span>
        </div>

        {payMutation.isError ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive-foreground">
            <TriangleAlert className="size-4 shrink-0" />
            <span className="font-medium">
              {payMutation.error instanceof Error
                ? payMutation.error.message
                : "Payment processing failed."}
            </span>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- Paid / failed / expired panels ---------------- */

function PaidPanel({
  session,
  order,
  granted,
  onReplay,
  replayResult,
  replaying,
}: {
  session: CheckoutSession;
  order: Order | null;
  granted: Entitlement[];
  onReplay: () => void;
  replayResult: { duplicated: boolean } | null;
  replaying?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="flex flex-col items-center rounded-2xl border border-success/30 bg-success/5 px-6 py-12 text-center"
    >
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
        className="mb-5 grid size-16 place-items-center rounded-full border-2 border-success/30 bg-success/10 text-success"
      >
        <CheckCircle2 className="size-8" />
      </motion.div>
      <h2 className="font-display text-4xl font-bold tracking-tight text-foreground">
        Payment succeeded
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground/90 leading-relaxed">
        Your order is confirmed and entitlements were granted. A{" "}
        <code className="rounded bg-secondary px-1 font-mono text-[11px]">
          payment.succeeded
        </code>{" "}
        event fired exactly once.
      </p>

      <div className="mt-5 w-full max-w-md rounded-lg border border-border bg-card p-4 text-left text-xs">
        <div className="flex flex-col gap-1.5 font-mono text-muted-foreground">
          <p className="flex justify-between gap-4">
            <span>checkout_id</span>
            <span className="text-foreground">{session.checkout_id}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span>order_id</span>
            <span className="text-foreground">{order?.order_id ?? "—"}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span>provider</span>
            <span className="text-foreground">{session.provider}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span>idempotency_key</span>
            <span className="max-w-[60%] truncate text-foreground">
              {session.idempotency_key}
            </span>
          </p>
        </div>
      </div>

      {granted.length > 0 ? (
        <div className="mt-5 w-full max-w-md rounded-lg border border-border bg-card p-4 text-left">
          <p className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
            Granted to your account
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {granted.map((g) => (
              <li key={g.product_id} className="flex items-center gap-2">
                <BadgeCheck className="size-4 shrink-0 text-success-strong" />
                <span className="truncate">
                  {session.cart.items.find((i) => i.product_id === g.product_id)
                    ?.title ?? g.product_id}
                </span>
                <span className="ml-auto shrink-0 text-caption text-muted-foreground">
                  {g.kind}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => order && downloadReceipt(order)}
          disabled={!order}
        >
          <Download className="size-3.5" />
          Download receipt
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReplay}
          disabled={replaying || replayResult !== null}
        >
          {replaying ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="size-3.5" />
          )}
          Replay webhook (idempotency demo)
        </Button>
        <Button variant="gradient" size="sm" asChild>
          <Link href="/cart">
            <ShoppingCart className="size-3.5" />
            Back to cart
          </Link>
        </Button>
      </div>

      {replayResult ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-xs text-success-strong">
          <BadgeCheck className="size-3.5" />
          Replayed — same idempotency_key, no double charge, no duplicate
          fulfillment.
        </p>
      ) : null}
    </motion.div>
  );
}

function DeclinedPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="flex flex-col items-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
        className="mb-5 grid size-16 place-items-center rounded-full border-2 border-destructive/30 bg-destructive/10 text-destructive"
      >
        <TriangleAlert className="size-8" />
      </motion.div>
      <h2 className="font-display text-4xl font-bold tracking-tight text-foreground">
        Payment declined
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground/90 leading-relaxed">
        The provider declined this payment (simulated test-mode decline). No
        charge was made and no entitlements were granted. Start a new checkout
        to retry — sessions are single-use.
      </p>
      <Button variant="gradient" className="mt-5" asChild>
        <Link href="/cart">
          Back to cart
          <ArrowRight />
        </Link>
      </Button>
    </motion.div>
  );
}

function ExpiredPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="flex flex-col items-center rounded-2xl border border-warning/30 bg-warning/5 px-6 py-12 text-center"
    >
      <motion.div 
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
        className="mb-5 grid size-16 place-items-center rounded-full border-2 border-warning/30 bg-warning/10 text-warning-strong"
      >
        <Hourglass className="size-8" />
      </motion.div>
      <h2 className="font-display text-4xl font-bold tracking-tight text-foreground">
        Checkout expired
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground/90 leading-relaxed">
        This checkout link expired before payment completed (30-minute
        validity). Your cart is untouched — start a fresh session.
      </p>
      <Button variant="gradient" className="mt-5" asChild>
        <Link href="/cart">
          Start a new checkout
          <ArrowRight />
        </Link>
      </Button>
    </motion.div>
  );
}

/* ---------------- Main client ---------------- */

export function CheckoutClient({ checkoutId }: { checkoutId: string }) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? "";

  const sessionQuery = useQuery({
    queryKey: ["checkout", checkoutId],
    queryFn: () => getCheckout(checkoutId),
  });

  const isPaid = sessionQuery.data?.status === "paid";
  const entitlementsQuery = useQuery({
    queryKey: ["entitlements", userId],
    queryFn: () => getEntitlements(userId),
    enabled: Boolean(isPaid && userId),
  });
  // Orders-table read: deep-linked paid sessions (cs-paid-demo) resolve
  // their order from the store; live payments pass it through the mutation.
  const orderQuery = useQuery({
    queryKey: ["order-for-checkout", checkoutId],
    queryFn: () => getOrderForCheckout(checkoutId),
    enabled: Boolean(isPaid),
  });

  const [paidOrder, setPaidOrder] = React.useState<Order | null>(null);
  const [replayResult, setReplayResult] = React.useState<{
    duplicated: boolean;
  } | null>(null);

  const replayMutation = useMutation({
    mutationFn: () => replayWebhook(checkoutId),
    onSuccess: (result) => {
      setReplayResult(result);
      void queryClient.invalidateQueries({ queryKey: ["checkout", checkoutId] });
      void queryClient.invalidateQueries({ queryKey: ["order-for-checkout", checkoutId] });
      void queryClient.invalidateQueries({ queryKey: ["entitlements", userId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const refreshSession = (order: Order | null) => {
    setPaidOrder(order);
    queryClient.invalidateQueries({ queryKey: ["checkout", checkoutId] });
    void queryClient.invalidateQueries({ queryKey: cartQueryKey(userId) });
  };

  /* ---------- Loading ---------- */
  if (sessionQuery.isLoading) {
    return (
      <PageContainer narrow>
        <SkeletonLines count={1} className="max-w-sm" />
        <div className="mt-6">
          <SkeletonCard className="h-80" />
        </div>
      </PageContainer>
    );
  }

  /* ---------- Error (404 / 503) ---------- */
  if (sessionQuery.isError || !sessionQuery.data) {
    const err = sessionQuery.error;
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : null;
    return (
      <PageContainer narrow>
        {status === 404 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Checkout session not found"
            description={`No session exists with the id "${checkoutId}". Sessions are single-use — create a new checkout from your cart.`}
            action={
              <Button variant="gradient" asChild>
                <Link href="/cart">
                  Back to cart
                  <ArrowRight />
                </Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title="Payment provider unreachable"
            message={
              err instanceof Error
                ? err.message
                : "The payment provider could not be reached (simulated)."
            }
            code="CHECKOUT_DOWN"
            onRetry={() => sessionQuery.refetch()}
          />
        )}
      </PageContainer>
    );
  }

  const session = sessionQuery.data;

  /* ---------- Expired ---------- */
  if (session.status === "expired") {
    return (
      <PageContainer narrow>
        <ExpiredPanel />
      </PageContainer>
    );
  }

  /* ---------- Paid ---------- */
  if (session.status === "paid") {
    const purchased = new Set(
      session.cart.items.map((i) => i.product_id),
    );
    const granted = (entitlementsQuery.data?.entitlements ?? []).filter((e) =>
      purchased.has(e.product_id),
    );
    const order = orderQuery.data ?? paidOrder;
    return (
      <PageContainer narrow>
        <PaidPanel
          session={session}
          order={order}
          granted={granted}
          onReplay={() => replayMutation.mutate()}
          replayResult={replayResult}
          replaying={replayMutation.isPending}
        />
      </PageContainer>
    );
  }

  /* ---------- Failed ---------- */
  if (session.status === "failed") {
    return (
      <PageContainer narrow>
        <DeclinedPanel />
      </PageContainer>
    );
  }

  /* ---------- Pending: the hosted embed ---------- */
  return (
    <PageContainer narrow>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-h1">
            Complete your purchase
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            Session expires in <Countdown expiresAt={session.expires_at} />
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/cart">Back to cart</Link>
        </Button>
      </div>

      <HostedEmbed session={session} onPaid={refreshSession} />

      {/* Delivery expectation timeline (UI §7.1) */}
      <ol className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-4 relative z-0">
        {[
          { title: "Pay securely", body: "Provider-hosted form, PCI-DSS out of your hands." },
          { title: "Instant entitlement", body: "payment.succeeded unlocks your item immediately." },
          { title: "Download proof", body: "Receipt and credential available in your profile." },
        ].map((step, index) => (
          <li key={step.title} className="group relative flex flex-col items-center text-center sm:items-start sm:text-left rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all hover:-translate-y-0.5">
            <span className="grid size-8 mb-3 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Demo strip + mock note — demo scaffolding, gated in production. */}
      {DEMO_MODE ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-card/40 px-4 py-3">
            <p className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
              Demo states
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/checkout/cs-fail-demo">Declined payment</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/checkout/cs-expired-demo">Expired session</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/checkout/cs-paid-demo">Already paid</Link>
            </Button>
          </div>

          <p className="mt-4 rounded-lg border border-border bg-card/50 px-4 py-3 text-caption leading-relaxed text-muted-foreground">
            <Lock className="mr-1.5 inline size-3 align-[-1px]" />
            Mock note: the frame above stands in for the{" "}
            <span className="font-medium text-foreground">
              {session.provider}
            </span>{" "}
            hosted checkout embed (<code className="font-mono">
              {session.checkout_url}
            </code>
            ). No card form is rendered here — payment UI is provider-hosted by
            design. Demo states:{" "}
            <Link href="/checkout/cs-fail-demo" className="underline">
              declined
            </Link>{" "}
            ·{" "}
            <Link href="/checkout/cs-expired-demo" className="underline">
              expired
            </Link>
            .
          </p>
        </>
      ) : null}
    </PageContainer>
  );
}
