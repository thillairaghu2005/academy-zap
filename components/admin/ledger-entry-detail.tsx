"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Hash,
  Scale,
} from "lucide-react";

import type { IntegrityStatus } from "@/lib/contracts/gamification";
import { getLedgerEntryDetail } from "@/lib/data/demo/gamification";
import { SkeletonLines } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";

const INTEGRITY_STYLES: Record<IntegrityStatus, string> = {
  verified: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  flagged: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  reversed: "border-rose-500/40 bg-rose-500/10 text-rose-700",
};

/**
 * The expandable row of the audit log (Task 3): the ledger entry linked to
 * an XP-affecting audit event — amount, demo-service balance before/after,
 * reason code, integrity. Fetched via getLedgerEntryDetail; the balance is
 * NEVER recomputed client-side (build.md §3).
 */
export function LedgerEntryDetail({ ledgerEntryId }: { ledgerEntryId: string }) {
  const detailQuery = useQuery({
    queryKey: ["ledger-entry", ledgerEntryId],
    queryFn: () => getLedgerEntryDetail(ledgerEntryId),
  });

  if (detailQuery.isLoading) {
    return <SkeletonLines count={3} className="max-w-xl" />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <ErrorState
        title="Couldn't load the ledger entry"
        message={
          detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "The ledger is not responding."
        }
        onRetry={() => detailQuery.refetch()}
      />
    );
  }

  const entry = detailQuery.data;
  const positive = entry.xp_delta >= 0;

  return (
    <div className="flex max-w-3xl flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          {positive ? (
            <ArrowUpRight className="size-4 text-emerald-700" />
          ) : (
            <ArrowDownRight className="size-4 text-rose-700" />
          )}
          <span
            className={cn(
              "font-display text-h3",
              positive ? "text-emerald-700" : "text-rose-700",
            )}
          >
            {positive ? "+" : ""}
            {entry.xp_delta} XP
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Scale className="size-3.5" />
          balance {entry.balance_before} → {entry.balance_after}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
            INTEGRITY_STYLES[entry.integrity_status],
          )}
        >
          {entry.integrity_status}
        </span>
      </div>

      <dl className="grid gap-x-8 gap-y-1.5 text-xs sm:grid-cols-2">
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-muted-foreground">Reason code</dt>
          <dd className="font-mono font-medium text-foreground">
            {entry.reason_code}
          </dd>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-muted-foreground">XP type</dt>
          <dd className="font-medium text-foreground">
            {entry.xp_type}
            <span className="ml-2 text-muted-foreground">
              ×{entry.multiplier_applied}
            </span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 sm:block">
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Hash className="size-3" />
            Entry hash
          </dt>
          <dd className="font-mono text-caption text-muted-foreground">
            {entry.entry_hash.slice(0, 18)}…
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 sm:block">
          <dt className="text-muted-foreground">Event</dt>
          <dd className="font-mono text-caption text-muted-foreground">
            {entry.event_id.slice(0, 18)}…
          </dd>
        </div>
      </dl>
    </div>
  );
}
