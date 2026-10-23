"use client";

import * as React from "react";
import { formatLocalDate } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Download, FlaskConical, ReceiptText } from "lucide-react";

import { getOrderHistory } from "@/lib/data/demo/commerce";
import { downloadReceipt } from "@/lib/demo/receipts";
import { formatMoney } from "@/lib/format";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLines } from "@/components/shared/skeletons";

/**
 * Learner-facing order history (Task 4 — persistent receipts). Orders are
 * persisted in the demo commerce store, so paid purchases survive page loads.
 */
export function OrderHistory() {
  const { user } = useSession();
  const userId = user?.id ?? "";

  const ordersQuery = useQuery({
    queryKey: ["order-history", userId],
    queryFn: () => getOrderHistory(userId),
    enabled: Boolean(userId),
  });

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="size-4 text-primary" />
          Order history
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ordersQuery.isLoading ? (
          <SkeletonLines count={3} className="max-w-sm" />
        ) : ordersQuery.isError ? (
          <ErrorState
            title="Couldn't load your orders"
            message={
              ordersQuery.error instanceof Error
                ? ordersQuery.error.message
                : "Your order history is unavailable."
            }
            onRetry={() => ordersQuery.refetch()}
          />
        ) : ordersQuery.data && ordersQuery.data.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {ordersQuery.data.map((order) => (
              <li
                key={order.order_id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
              >
                {order.items.some((item) => item.kind === "lab") ? (
                  <FlaskConical className="size-5 shrink-0 text-primary" />
                ) : (
                  <BookOpen className="size-5 shrink-0 text-primary" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {order.items.map((item) => item.title).join(", ")}
                  </span>
                  <span className="block text-caption text-muted-foreground">
                    {formatLocalDate(order.created_at)} ·{" "}
                    {order.order_id}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold">
                  {formatMoney(order.amount_cents, order.currency)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Download receipt for ${order.order_id}`}
                  onClick={() => downloadReceipt(order)}
                >
                  <Download className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title="No orders yet"
            description="Paid courses and lab passes you purchase will show up here with downloadable receipts."
          />
        )}
      </CardContent>
    </Card>
  );
}
