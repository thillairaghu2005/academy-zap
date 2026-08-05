"use client";

import { useQuery } from "@tanstack/react-query";

import type { Problem } from "@/lib/contracts/judge";
import { listProblems } from "@/lib/api/judge";
import { useSession } from "@/components/providers/session-provider";
import { PageContainer } from "@/components/shared/page-container";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DifficultyBadge } from "@/components/admin/status-badges";

export function AdminProblemsClient() {
  const { user } = useSession();

  const problemsQuery = useQuery({
    queryKey: ["admin-problems"],
    queryFn: () => listProblems(),
    enabled: Boolean(user),
  });

  const columns: DataTableColumn<Problem>[] = [
    {
      key: "title",
      header: "Problem",
      sortable: true,
      sortValue: (p) => p.title,
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{p.title}</p>
          <p className="truncate text-xs text-muted-foreground">{p.slug}</p>
        </div>
      ),
    },
    {
      key: "difficulty",
      header: "Difficulty",
      sortable: true,
      sortValue: (p) => p.difficulty,
      cell: (p) => <DifficultyBadge difficulty={p.difficulty} />,
    },
    {
      key: "topics",
      header: "Topics",
      cell: (p) => (
        <span className="text-xs text-muted-foreground">
          {p.topics.join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "hidden_test_count",
      header: "Hidden tests",
      sortable: true,
      sortValue: (p) => p.hidden_test_count,
      cell: (p) => <span className="tabular-nums">{p.hidden_test_count}</span>,
    },
    {
      key: "time_limit_ms",
      header: "Time limit",
      sortable: true,
      sortValue: (p) => p.time_limit_ms,
      cell: (p) => (
        <span className="tabular-nums">
          {(p.time_limit_ms / 1000).toFixed(1)}s
        </span>
      ),
    },
  ];

  return (
    <PageContainer>
      <div>
        <h1 className="font-display text-h1">
          Problems
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only judge catalog view — problem authoring is out of the F7
          scope.
        </p>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={problemsQuery.data ?? []}
          rowKey={(p) => p.id}
          loading={problemsQuery.isLoading}
          error={problemsQuery.isError}
          errorMessage={
            problemsQuery.error instanceof Error
              ? problemsQuery.error.message
              : undefined
          }
          onRetry={() => problemsQuery.refetch()}
          searchPlaceholder="Search problems…"
          searchText={(p) => `${p.title} ${p.slug} ${p.topics.join(" ")}`}
          filters={[
            {
              id: "difficulty",
              label: "difficulty",
              options: [
                { value: "easy", label: "Easy" },
                { value: "medium", label: "Medium" },
                { value: "hard", label: "Hard" },
              ],
              match: (p, value) => p.difficulty === value,
            },
          ]}
          emptyTitle="No problems"
          emptyDescription="The judge catalog is empty."
        />
      </div>
    </PageContainer>
  );
}
