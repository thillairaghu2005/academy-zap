"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Mail,
  Users,
} from "lucide-react";

import type { Plan, SeatStatus } from "@/lib/contracts/commerce";
import { getSubscription, listPlans } from "@/lib/api/commerce";
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
/*  B2B subscription + seat management (build.md F6).                  */
/*                                                                    */
/*  Mock-only until the Commerce backend exists. Seat actions          */
/*  (invite / suspend / reassign) are deliberately placeholder — the   */
/*  docs defer them; this surface renders the read model only.         */
/* ------------------------------------------------------------------ */

const SEAT_STATUS_STYLES: Record<
  SeatStatus,
  { label: string; className: string; dot: string }
> = {
  active: {
    label: "Active",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
    dot: "bg-emerald-500",
  },
  invited: {
    label: "Invited",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700",
    dot: "bg-amber-500",
  },
  suspended: {
    label: "Suspended",
    className: "border-rose-500/40 bg-rose-500/10 text-rose-700",
    dot: "bg-rose-500",
  },
};

export function BillingClient() {
  const { user } = useSession();
  const userId = user?.id ?? "";

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", userId],
    queryFn: () => getSubscription(userId),
    enabled: Boolean(user),
  });

  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: () => listPlans(),
    enabled: Boolean(user),
  });

  /* ---------- Signed out ---------- */
  if (!user) {
    return (
      <PageContainer narrow>
        <EmptyState
          icon={Building2}
          title="Sign in to manage your subscription"
          description="B2B seat management and invoices are tied to your org account."
        />
      </PageContainer>
    );
  }

  /* ---------- Loading ---------- */
  if (subscriptionQuery.isLoading || plansQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonLines count={1} className="max-w-sm" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
        </div>
        <div className="mt-6">
          <SkeletonCard className="h-64" />
        </div>
      </PageContainer>
    );
  }

  /* ---------- Error / no subscription ---------- */
  if (subscriptionQuery.isError || !subscriptionQuery.data) {
    const err = subscriptionQuery.error;
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : null;
    if (status === 404) {
      return (
        <PageContainer>
          <EmptyState
            icon={Building2}
            title="No org subscription"
            description="This account isn't on a B2B plan. Team and Organization plans appear here once the Commerce backend provisions them."
            action={
              <Button variant="gradient" asChild>
                <a href="#plans">View plans</a>
              </Button>
            }
          />
          <div className="mt-8">{renderPlans(plansQuery.data ?? [])}</div>
        </PageContainer>
      );
    }
    return (
      <PageContainer>
        <ErrorState
          title="Couldn't load your subscription"
          message={
            err instanceof Error
              ? err.message
              : "The subscription service is not responding."
          }
          code="SUBSCRIPTION_ERR"
          onRetry={() => subscriptionQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const subscription = subscriptionQuery.data;

  return (
    <PageContainer>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-h1">
            Subscription & seats
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subscription.org_name} ·{" "}
            {subscription.plan.billing_cycle} billing
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5",
            subscription.active
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
              : "border-rose-500/40 bg-rose-500/10 text-rose-700",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              subscription.active ? "bg-emerald-500" : "bg-rose-500",
            )}
          />
          {subscription.active ? "Active" : "Suspended"}
        </Badge>
      </div>

      <div id="plans" className="mt-6">{renderPlans(plansQuery.data ?? [], subscription.plan.plan_id)}</div>

      {/* Seats */}
      <div className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-h2">
              Seats
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {subscription.seats.length} seats on the{" "}
              {subscription.plan.name} plan
            </p>
          </div>
          <Button variant="outline" size="sm" disabled title="Pending Commerce backend">
            <Users className="size-3.5" />
            Invite seat
          </Button>
        </div>

        <Card className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-caption uppercase tracking-widest text-muted-foreground/70">
                  <th className="px-4 py-2.5 font-semibold">Member</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Assigned course</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Seat</th>
                </tr>
              </thead>
              <tbody>
                {subscription.seats.map((seat) => {
                  const style =
                    SEAT_STATUS_STYLES[seat.status] ??
                    ({ label: seat.status, className: "", dot: "bg-muted" } as const);
                  return (
                    <tr
                      key={seat.seat_id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{seat.display_name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="size-3" />
                          {seat.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
                            style.className,
                          )}
                        >
                          <span className={cn("size-1.5 rounded-full", style.dot)} />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {seat.assigned_course_id ?? (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <code className="font-mono text-[11px] text-muted-foreground">
                          {seat.seat_id}
                        </code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Next invoice */}
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <CreditCard className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Next invoice</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  renews {new Date(subscription.renews_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-h2">
                {formatMoney(subscription.next_invoice_cents)}
              </p>
              <p className="text-xs text-muted-foreground">
                {subscription.seats.filter((s) => s.status === "active").length}{" "}
                active seats × {formatMoney(subscription.plan.price_per_seat_cents)}
                /seat
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 flex items-start gap-1.5 text-caption leading-relaxed text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-3 shrink-0" />
          Mock-only read model until the Commerce backend lands. Seat
          provisioning, invites and reassignment are deferred — the docs leave
          them open.
        </p>
      </div>
    </PageContainer>
  );
}

/* ---------------- Plans ---------------- */

function renderPlans(plans: Plan[], currentPlanId?: string) {
  return (
    <div>
      <h2 className="font-display text-h2">
        Plans
      </h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = plan.plan_id === currentPlanId;
          return (
            <Card
              key={plan.plan_id}
              className={cn(
                "relative flex flex-col gap-3 p-5",
                isCurrent && "border-primary/50 bg-primary/[0.03]",
              )}
            >
              {isCurrent ? (
                <Badge className="absolute -top-2.5 right-4">Current plan</Badge>
              ) : null}
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <p className="font-display text-small font-semibold">{plan.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {plan.billing_cycle}
                  </p>
                </div>
              </div>
              <p className="font-display text-h2">
                {formatMoney(plan.price_per_seat_cents)}
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}
                  /seat/mo
                </span>
              </p>
              <Button
                variant={isCurrent ? "outline" : "gradient"}
                size="sm"
                disabled={isCurrent}
                className="mt-auto"
              >
                {isCurrent ? (
                  "Current plan"
                ) : (
                  <>
                    Switch plan
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
