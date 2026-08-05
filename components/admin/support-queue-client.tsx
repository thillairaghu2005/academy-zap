"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

import type { SupportTicket, TicketCategory } from "@/lib/contracts/support";
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from "@/lib/contracts/support";
import { listAdminTickets } from "@/lib/api/support";
import { useSession } from "@/components/providers/session-provider";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import {
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/support/support-badges";
import { formatDateTime } from "@/lib/format-admin";

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  billing: "Billing",
  courses: "Courses",
  judge: "Judge",
  labs: "Labs",
  assessments: "Assessments",
  account: "Account",
  other: "Other",
};

export function AdminSupportQueueClient() {
  const { user } = useSession();

  const ticketsQuery = useQuery({
    queryKey: ["admin-support-queue"],
    queryFn: () => listAdminTickets(user!),
    enabled: Boolean(user),
  });

  const columns: DataTableColumn<SupportTicket>[] = [
    {
      key: "id",
      header: "Ticket",
      sortable: true,
      sortValue: (t) => t.id,
      cell: (t) => (
        <code className="font-mono text-xs text-foreground">{t.id}</code>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      sortable: true,
      sortValue: (t) => t.subject,
      cell: (t) => (
        <div className="min-w-0">
          <Link
            href={`/admin/support/${t.id}`}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {t.subject}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {t.created_by_name}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (t) => t.category,
      cell: (t) => <TicketCategoryBadge category={t.category} />,
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      sortValue: (t) => t.priority,
      cell: (t) => <TicketPriorityBadge priority={t.priority} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (t) => t.status,
      cell: (t) => <TicketStatusBadge status={t.status} />,
    },
    {
      key: "assignee",
      header: "Assignee",
      sortable: true,
      sortValue: (t) => t.assignee_name ?? "",
      cell: (t) =>
        t.assignee_name ? (
          <span className="text-xs">{t.assignee_name}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "updated_at",
      header: "Updated",
      sortable: true,
      sortValue: (t) => t.updated_at,
      cell: (t) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(t.updated_at)}
        </span>
      ),
    },
  ];

  return (
    <PageContainer>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Support queue
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every ticket in the mock store — open, resolve or assign from the
          detail view. Internal notes are visible here, never to learners.
        </p>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={ticketsQuery.data ?? []}
          rowKey={(t) => t.id}
          loading={ticketsQuery.isLoading}
          error={ticketsQuery.isError}
          errorMessage={
            ticketsQuery.error instanceof Error
              ? ticketsQuery.error.message
              : undefined
          }
          onRetry={() => ticketsQuery.refetch()}
          searchPlaceholder="Search tickets…"
          searchText={(t) =>
            `${t.id} ${t.subject} ${t.created_by_name} ${t.messages
              .map((message) => message.body)
              .join(" ")}`
          }
          filters={[
            {
              id: "status",
              label: "status",
              options: [
                { value: "open", label: "Open" },
                { value: "pending", label: "Pending" },
                { value: "resolved", label: "Resolved" },
                { value: "closed", label: "Closed" },
              ],
              match: (t, value) => t.status === value,
            },
            {
              id: "priority",
              label: "priority",
              // Values from the contract list — label copy is this surface's.
              options: TICKET_PRIORITIES.map((value) => ({
                value,
                label: value[0]!.toUpperCase() + value.slice(1),
              })),
              match: (t, value) => t.priority === value,
            },
            {
              id: "category",
              label: "category",
              options: TICKET_CATEGORIES.map((value) => ({
                value,
                label: CATEGORY_LABELS[value],
              })),
              match: (t, value) => t.category === value,
            },
          ]}
          actions={(t) => (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs"
            >
              <Link href={`/admin/support/${t.id}`}>
                Open
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          )}
          emptyTitle="No tickets in the queue"
          emptyDescription="New learner tickets land here."
        />
      </div>
    </PageContainer>
  );
}
