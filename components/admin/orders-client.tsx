"use client";

import { useQuery } from "@tanstack/react-query";

import type { Order } from "@/lib/contracts/commerce";
import { listAdminOrders } from "@/lib/api/admin";
import { useSession } from "@/components/providers/session-provider";
import { PageContainer } from "@/components/shared/page-container";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { OrderStatusBadge } from "@/components/admin/status-badges";
import { formatDateTime } from "@/lib/format-admin";
import { formatMoney } from "@/lib/format";

export function AdminOrdersClient() {
  const { user } = useSession();

  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => listAdminOrders(),
    enabled: Boolean(user),
  });

  const columns: DataTableColumn<Order>[] = [
    {
      key: "order_id",
      header: "Order",
      sortable: true,
      sortValue: (o) => o.order_id,
      cell: (o) => (
        <code className="font-mono text-xs text-foreground">{o.order_id}</code>
      ),
    },
    {
      key: "items",
      header: "Item",
      sortable: true,
      sortValue: (o) => o.items.map((i) => i.title).join(", "),
      cell: (o) => (
        <span className="max-w-md truncate">{o.items.map((i) => i.title).join(", ")}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      sortValue: (o) => o.amount_cents,
      cell: (o) => (
        <span className="font-medium">{formatMoney(o.amount_cents, o.currency)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (o) => o.status,
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: "provider",
      header: "Provider",
      sortable: true,
      sortValue: (o) => o.provider,
      cell: (o) => <span className="capitalize">{o.provider}</span>,
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      sortValue: (o) => o.created_at,
      cell: (o) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(o.created_at)}
        </span>
      ),
    },
  ];

  return (
    <PageContainer>
      <div>
        <h1 className="font-display text-h1">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only payments view from the mock `orders` table.
        </p>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={ordersQuery.data ?? []}
          rowKey={(o) => o.order_id}
          loading={ordersQuery.isLoading}
          error={ordersQuery.isError}
          errorMessage={
            ordersQuery.error instanceof Error
              ? ordersQuery.error.message
              : undefined
          }
          onRetry={() => ordersQuery.refetch()}
          searchPlaceholder="Search orders…"
          searchText={(o) => `${o.order_id} ${o.items.map((i) => i.title).join(" ")}`}
          filters={[
            {
              id: "status",
              label: "status",
              options: [
                { value: "paid", label: "Paid" },
                { value: "failed", label: "Failed" },
                { value: "refunded", label: "Refunded" },
              ],
              match: (o, value) => o.status === value,
            },
          ]}
          emptyTitle="No orders yet"
          emptyDescription="Orders appear here once purchases complete."
        />
      </div>
    </PageContainer>
  );
}
