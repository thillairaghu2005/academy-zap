"use client";

import { useQuery } from "@tanstack/react-query";

import type { AuditEntry } from "@/lib/mocks/admin";
import { listAuditEntries } from "@/lib/api/admin";
import { useSession } from "@/components/providers/session-provider";
import { PageContainer } from "@/components/shared/page-container";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { formatDateTime } from "@/lib/format-admin";

export function AdminAuditClient() {
  const { user } = useSession();

  const auditQuery = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => listAuditEntries(),
    enabled: Boolean(user),
  });

  const columns: DataTableColumn<AuditEntry>[] = [
    {
      key: "created_at",
      header: "When",
      sortable: true,
      sortValue: (e) => e.created_at,
      cell: (e) => (
        <code className="font-mono text-[11px] text-muted-foreground">
          {formatDateTime(e.created_at)}
        </code>
      ),
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      sortValue: (e) => e.action,
      cell: (e) => (
        <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          {e.action}
        </code>
      ),
    },
    {
      key: "detail",
      header: "Detail",
      sortable: true,
      sortValue: (e) => e.detail,
      cell: (e) => <span className="max-w-xl">{e.detail}</span>,
    },
    {
      key: "actor",
      header: "Actor",
      sortable: true,
      sortValue: (e) => e.actor_name,
      cell: (e) => <span className="text-sm">{e.actor_name}</span>,
    },
    {
      key: "entity",
      header: "Entity",
      sortable: true,
      sortValue: (e) => e.entity,
      cell: (e) => (
        <span className="text-xs text-muted-foreground">
          {e.entity}
          {e.entity_id ? (
            <code className="ml-1 font-mono text-[10px]">
              {e.entity_id.slice(0, 13)}…
            </code>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <PageContainer>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Append-only moderation trail — entries are created by admin writes
          and never rewritten or deleted.
        </p>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={auditQuery.data ?? []}
          rowKey={(e) => e.id}
          loading={auditQuery.isLoading}
          error={auditQuery.isError}
          errorMessage={
            auditQuery.error instanceof Error
              ? auditQuery.error.message
              : undefined
          }
          onRetry={() => auditQuery.refetch()}
          searchPlaceholder="Search audit entries…"
          searchText={(e) => `${e.action} ${e.detail} ${e.actor_name} ${e.entity}`}
          emptyTitle="No audit entries"
          emptyDescription="Admin writes will appear here."
          caption="newest first"
        />
      </div>
    </PageContainer>
  );
}
