"use client";

import { useQuery } from "@tanstack/react-query";
import { Monitor } from "lucide-react";

import type { Lab } from "@/lib/contracts/lab";
import { listLabs } from "@/lib/api/lab";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/shared/page-container";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DifficultyBadge } from "@/components/admin/status-badges";

export function AdminLabsClient() {
  const { user } = useSession();

  const labsQuery = useQuery({
    queryKey: ["admin-labs"],
    queryFn: () => listLabs(),
    enabled: Boolean(user),
  });

  const columns: DataTableColumn<Lab>[] = [
    {
      key: "title",
      header: "Lab",
      sortable: true,
      sortValue: (l) => l.title,
      cell: (l) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{l.title}</p>
          <p className="truncate text-xs text-muted-foreground">{l.slug}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (l) => l.category,
    },
    {
      key: "difficulty",
      header: "Difficulty",
      sortable: true,
      sortValue: (l) => l.difficulty,
      cell: (l) => <DifficultyBadge difficulty={l.difficulty} />,
    },
    {
      key: "estimated_minutes",
      header: "Est. minutes",
      sortable: true,
      sortValue: (l) => l.estimated_minutes,
      cell: (l) => <span className="tabular-nums">{l.estimated_minutes}</span>,
    },
    {
      key: "hard_timeout_minutes",
      header: "Hard timeout",
      sortable: true,
      sortValue: (l) => l.hard_timeout_minutes,
      cell: (l) => <span className="tabular-nums">{l.hard_timeout_minutes}m</span>,
    },
    {
      key: "gui",
      header: "GUI",
      sortable: true,
      sortValue: (l) => (l.requires_gui ? 1 : 0),
      cell: (l) =>
        l.requires_gui ? (
          <Badge variant="outline" className="gap-1 text-caption">
            <Monitor className="size-3" /> Guacamole
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">terminal</span>
        ),
    },
  ];

  return (
    <PageContainer>
      <div>
        <h1 className="font-display text-h1">Labs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only catalog view — lab authoring is out of the F7 scope.
        </p>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={labsQuery.data ?? []}
          rowKey={(l) => l.id}
          loading={labsQuery.isLoading}
          error={labsQuery.isError}
          errorMessage={
            labsQuery.error instanceof Error
              ? labsQuery.error.message
              : undefined
          }
          onRetry={() => labsQuery.refetch()}
          searchPlaceholder="Search labs…"
          searchText={(l) => `${l.title} ${l.category} ${l.difficulty}`}
          emptyTitle="No labs"
          emptyDescription="The lab catalog is empty."
        />
      </div>
    </PageContainer>
  );
}
