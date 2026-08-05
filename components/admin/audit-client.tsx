"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, FilterX, Link2 } from "lucide-react";

import type { AuditEntry } from "@/lib/mocks/admin";
import { listAuditEntries } from "@/lib/api/admin";
import { useSession } from "@/components/providers/session-provider";
import { PageContainer } from "@/components/shared/page-container";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { LedgerEntryDetail } from "@/components/admin/ledger-entry-detail";
import { ReconciliationPanel } from "@/components/admin/reconciliation-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format-admin";

/** Append-only log rows that changed XP/economy state are ledger-linked. */
const hasLedgerLink = (entry: AuditEntry) => Boolean(entry.ledger_entry_id);

export function AdminAuditClient() {
  const { user } = useSession();

  const auditQuery = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => listAuditEntries(),
    enabled: Boolean(user),
  });

  /* ---- Filters: actor, action/event type, date range, ledger-only ---- */
  const [actorFilter, setActorFilter] = React.useState("all");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [ledgerOnly, setLedgerOnly] = React.useState(false);

  const actors = React.useMemo(() => {
    const set = new Set((auditQuery.data ?? []).map((e) => e.actor_name));
    return [...set].sort();
  }, [auditQuery.data]);

  const actions = React.useMemo(() => {
    const set = new Set((auditQuery.data ?? []).map((e) => e.action));
    return [...set].sort();
  }, [auditQuery.data]);

  const filtered = React.useMemo(() => {
    let rows = auditQuery.data ?? [];
    if (actorFilter !== "all") {
      rows = rows.filter((e) => e.actor_name === actorFilter);
    }
    if (actionFilter !== "all") {
      rows = rows.filter((e) => e.action === actionFilter);
    }
    if (dateFrom) {
      rows = rows.filter((e) => e.created_at.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      rows = rows.filter((e) => e.created_at.slice(0, 10) <= dateTo);
    }
    if (ledgerOnly) {
      rows = rows.filter(hasLedgerLink);
    }
    return rows;
  }, [auditQuery.data, actorFilter, actionFilter, dateFrom, dateTo, ledgerOnly]);

  const hasActiveFilters =
    actorFilter !== "all" ||
    actionFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    ledgerOnly;

  const clearFilters = () => {
    setActorFilter("all");
    setActionFilter("all");
    setDateFrom("");
    setDateTo("");
    setLedgerOnly(false);
  };

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
      cell: (e) => (
        <div className="flex max-w-xl flex-col gap-0.5">
          <span>{e.detail}</span>
          {hasLedgerLink(e) ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
              <Link2 className="size-3" />
              Linked ledger entry
            </span>
          ) : null}
        </div>
      ),
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
          and never rewritten or deleted. Rows with an
          <Link2 className="mx-1 inline size-3.5 text-primary" />
          link changed XP/economy state; expand them to see the linked ledger
          entry.
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex flex-col gap-1.5 lg:min-w-[150px]">
            <Label htmlFor="audit-actor" className="text-[11px] text-muted-foreground">
              Actor
            </Label>
            <Select value={actorFilter} onValueChange={setActorFilter}>
              <SelectTrigger id="audit-actor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actors</SelectItem>
                {actors.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 lg:min-w-[180px]">
            <Label htmlFor="audit-action" className="text-[11px] text-muted-foreground">
              Event type
            </Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger id="audit-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="audit-from" className="text-[11px] text-muted-foreground">
                From
              </Label>
              <Input
                id="audit-from"
                name="date_from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-36"
              />
            </div>
            <span className="pb-2 text-muted-foreground">→</span>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="audit-to" className="text-[11px] text-muted-foreground">
                To
              </Label>
              <Input
                id="audit-to"
                name="date_to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-36"
              />
            </div>
          </div>

          <button
            onClick={() => setLedgerOnly((v) => !v)}
            aria-pressed={ledgerOnly}
            className={
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              (ledgerOnly
                ? "border-primary/50 bg-primary/10 font-medium text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground")
            }
          >
            <Link2 className="size-3.5" />
            Ledger-linked only
          </button>

          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="lg:ml-auto"
            >
              <FilterX className="size-4" />
              Clear filters
            </Button>
          ) : (
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:ml-auto lg:inline-flex">
              <CalendarRange className="size-3.5" />
              {filtered.length} of {auditQuery.data?.length ?? 0} rows shown
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={filtered}
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
          emptyDescription={
            hasActiveFilters
              ? "No rows match the current filters."
              : "Admin writes will appear here."
          }
          caption="newest first"
          expandable={hasLedgerLink}
          expandedRow={(entry) =>
            entry.ledger_entry_id ? (
              <LedgerEntryDetail ledgerEntryId={entry.ledger_entry_id} />
            ) : null
          }
        />
      </div>

      <ReconciliationPanel />
    </PageContainer>
  );
}
