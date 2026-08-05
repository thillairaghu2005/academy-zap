"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Search,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";

/* ------------------------------------------------------------------ */
/*  Generic admin DataTable (F7) — search, column filters, sortable    */
/*  headers, pagination, and the loading / empty / error states.       */
/*  All processing is client-side over the mock read; the real CMS      */
/*  would push these params server-side, and the props stay the same.   */
/* ------------------------------------------------------------------ */

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** When set, the column header toggles sort order. */
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableFilter<T> {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  /** Match a row against a selected filter value. */
  match: (row: T, value: string) => boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** The text search matches against (e.g. title + category). */
  searchText?: (row: T) => string;
  filters?: DataTableFilter<T>[];
  pageSize?: number;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Extra toolbar content (e.g. a "New course" button). */
  toolbar?: React.ReactNode;
  /** Row-level action buttons rendered in a right-aligned column. */
  actions?: (row: T) => React.ReactNode;
  /** Footer caption under the count, e.g. row totals. */
  caption?: string;
}

type SortDir = "asc" | "desc";

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  searchable = true,
  searchPlaceholder = "Search…",
  searchText,
  filters = [],
  pageSize = 8,
  loading = false,
  error = false,
  errorMessage,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  toolbar,
  actions,
  caption,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>(
    () => Object.fromEntries(filters.map((f) => [f.id, "all"])),
  );
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(1);

  const resetPage = React.useCallback(() => setPage(1), []);

  const setQueryAndReset = (value: string) => {
    setQuery(value);
    resetPage();
  };
  const setFilterAndReset = (id: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [id]: value }));
    resetPage();
  };

  const visible = React.useMemo(() => {
    let out = rows;
    if (query.trim() && searchText) {
      const q = query.trim().toLowerCase();
      out = out.filter((row) => searchText(row).toLowerCase().includes(q));
    }
    for (const filter of filters) {
      const value = filterValues[filter.id];
      if (value && value !== "all") {
        out = out.filter((row) => filter.match(row, value));
      }
    }
    const sortColumn = columns.find((c) => c.key === sortKey);
    if (sortColumn && sortColumn.sortValue) {
      const sorter = sortColumn.sortValue;
      const dir = sortDir;
      out = [...out].sort((a, b) => {
        const cmp = compareValues(sorter(a), sorter(b));
        return dir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, query, searchText, filters, filterValues, columns, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = visible.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;
    if (sortKey === column.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column.key);
      setSortDir("asc");
    }
    resetPage();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar: search + filters + actions */}
      {(searchable || filters.length > 0 || toolbar) ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {searchable ? (
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQueryAndReset(e.target.value)}
                className="pl-9 pr-9"
                aria-label={searchPlaceholder}
              />
              {query ? (
                <button
                  onClick={() => setQueryAndReset("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ) : null}

          {filters.map((filter) => (
            <Select
              key={filter.id}
              value={filterValues[filter.id] ?? "all"}
              onValueChange={(v) => setFilterAndReset(filter.id, v)}
            >
              <SelectTrigger className="w-full lg:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label.toLowerCase()}s</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {toolbar ? <div className="lg:ml-auto">{toolbar}</div> : null}
        </div>
      ) : null}

      {/* Table / states */}
      {error ? (
        <ErrorState
          title="Couldn't load this list"
          message={errorMessage ?? "The admin backend is not responding."}
          code="ADMIN_ERR"
          onRetry={onRetry}
        />
      ) : loading ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={
            emptyDescription ??
            (query || Object.values(filterValues).some((v) => v !== "all")
              ? "No rows match the current search or filters."
              : undefined)
          }
          action={
            query || Object.values(filterValues).some((v) => v !== "all") ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setFilterValues(
                    Object.fromEntries(filters.map((f) => [f.id, "all"])),
                  );
                  resetPage();
                }}
              >
                Clear search & filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-widest text-muted-foreground/70">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        sortKey === column.key
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                      className={cn(
                        "px-4 py-2.5 font-semibold",
                        column.sortable ? "cursor-pointer select-none" : "",
                        column.className,
                      )}
                      onClick={() => toggleSort(column)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {column.header}
                        {column.sortable ? (
                          sortKey === column.key ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="size-3" />
                            ) : (
                              <ArrowDown className="size-3" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          )
                        ) : null}
                      </span>
                    </th>
                  ))}
                  {actions ? (
                    <th className="px-4 py-2.5 text-right font-semibold">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn("px-4 py-3 align-middle", column.className)}
                      >
                        {column.cell ? column.cell(row) : String((row as Record<string, unknown>)[column.key] ?? "—")}
                      </td>
                    ))}
                    {actions ? (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {actions(row)}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {visible.length} {visible.length === 1 ? "row" : "rows"}
              {caption ? <span className="ml-1.5">· {caption}</span> : null}
            </p>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="px-2 text-xs text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
