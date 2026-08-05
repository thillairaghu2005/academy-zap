"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BookMarked,
  CheckCircle2,
  FileWarning,
  GitCommitHorizontal,
  Link2,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";

import type { LedgerAuditView } from "@/lib/contracts/gamification";
import { getLedgerAudit } from "@/lib/api/gamification";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Ledger viewer — the auditability surface (§7.2). Shows the raw      */
/*  append-only ledger, the live hash-chain status, and the versioned   */
/*  ProgressContext snapshots with diffs. This is the frontend half of  */
/*  \"show me exactly why user X is Rank 7\".                            */
/* ------------------------------------------------------------------ */

export function LedgerViewer({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ledger-audit", userId],
    queryFn: () => getLedgerAudit(userId),
    enabled: open,
    retry: false,
  });

  const [tab, setTab] = React.useState<"entries" | "versions">("entries");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="size-4" /> XP ledger — auditable trail
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6">
            <SkeletonLines count={5} />
          </div>
        ) : isError || !data ? (
          <ErrorState
            title="Ledger unavailable"
            message="The ledger read failed right now."
            onRetry={() => refetch()}
          />
        ) : (
          <>
            {/* Chain status banner */}
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4",
                data.chain.valid
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-rose-500/40 bg-rose-500/10",
              )}
            >
              {data.chain.valid ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
              ) : (
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-rose-500" />
              )}
              <div>
                <p
                  className={cn(
                    "font-display text-sm font-semibold",
                    data.chain.valid
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {data.chain.valid
                    ? "Hash chain verified"
                    : "Chain integrity BROKEN"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {data.chain.valid
                    ? `${data.entries.length} entries linked via SHA-256 (§7.2). Every rank and XP number on this platform derives from this chain.`
                    : `Broken link at entry #${data.chain.broken_at} — a bug or tamper attempt (P0).`}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-4 inline-flex overflow-hidden rounded-lg border border-border">
              <button
                onClick={() => setTab("entries")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  tab === "entries"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Link2 className="size-3.5" /> Entries ({data.entries.length})
              </button>
              <button
                onClick={() => setTab("versions")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  tab === "versions"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <GitCommitHorizontal className="size-3.5" /> Context versions
              </button>
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border">
              {tab === "entries" ? (
                <LedgerEntriesTable entries={data.entries} />
              ) : (
                <VersionsView snapshots={data.snapshots} diffs={data.diffs} />
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                Append-only — nothing is ever mutated or deleted
              </p>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                <X /> Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Entries table                                                      */
/* ------------------------------------------------------------------ */

const XP_TYPE_STYLE: Record<string, string> = {
  completion: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  mastery: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  bonus: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  adjustment: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

const INTEGRITY_STYLE: Record<string, string> = {
  verified: "text-emerald-600 dark:text-emerald-400",
  flagged: "text-amber-600 dark:text-amber-400",
  reversed: "text-rose-600 dark:text-rose-400",
};

function LedgerEntriesTable({ entries }: { entries: LedgerAuditView["entries"] }) {
  return (
    <table className="w-full text-left text-xs">
      <thead className="sticky top-0 bg-card text-[10px] uppercase tracking-wider text-muted-foreground">
        <tr>
          <th className="px-3 py-2 font-medium">Date</th>
          <th className="px-3 py-2 font-medium">Reason</th>
          <th className="px-3 py-2 font-medium">XP</th>
          <th className="px-3 py-2 font-medium">Status</th>
          <th className="px-3 py-2 font-medium">Hash</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {entries.map((e, i) => (
          <motion.tr
            key={e.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.4) }}
            className={cn(
              "align-top",
              e.integrity_status === "reversed" && "bg-rose-500/5",
              e.integrity_status === "flagged" && "bg-amber-500/5",
            )}
          >
            <td className="whitespace-nowrap px-3 py-2 font-mono text-muted-foreground">
              {new Date(e.created_at).toLocaleDateString()}
            </td>
            <td className="px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={cn("text-[9px]", XP_TYPE_STYLE[e.xp_type])}>
                  {e.xp_type}
                </Badge>
                <span className="font-mono text-[10px]">{e.reason_code}</span>
                {e.multiplier_applied !== 1 ? (
                  <span className="text-[9px] text-muted-foreground">
                    ×{e.multiplier_applied.toFixed(2)}
                  </span>
                ) : null}
              </div>
            </td>
            <td
              className={cn(
                "whitespace-nowrap px-3 py-2 font-mono font-semibold tabular-nums",
                e.xp_delta < 0 ? "text-rose-500" : "text-emerald-500",
              )}
            >
              {e.xp_delta > 0 ? "+" : ""}
              {e.xp_delta}
            </td>
            <td className="whitespace-nowrap px-3 py-2">
              <span
                className={cn(
                  "flex items-center gap-1 font-medium capitalize",
                  INTEGRITY_STYLE[e.integrity_status],
                )}
              >
                {e.integrity_status === "verified" ? (
                  <CheckCircle2 className="size-3" />
                ) : e.integrity_status === "flagged" ? (
                  <FileWarning className="size-3" />
                ) : (
                  <TriangleAlert className="size-3" />
                )}
                {e.integrity_status}
              </span>
            </td>
            <td className="px-3 py-2">
              <div className="font-mono text-[9px] text-muted-foreground">
                <p className="truncate text-emerald-600/70 dark:text-emerald-400/70" title={e.prev_hash}>
                  prev {e.prev_hash.slice(0, 8)}…
                </p>
                <p className="truncate" title={e.entry_hash}>
                  self {e.entry_hash.slice(0, 8)}…
                </p>
              </div>
            </td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------------ */
/*  Versions view — snapshots + diffs                                  */
/* ------------------------------------------------------------------ */

function VersionsView({
  snapshots,
  diffs,
}: {
  snapshots: LedgerAuditView["snapshots"];
  diffs: LedgerAuditView["diffs"];
}) {
  return (
    <div className="divide-y divide-border">
      {diffs.map((d) => (
        <div key={`${d.from_version}-${d.to_version}`} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">
              v{d.from_version} → v{d.to_version}
            </span>
            {d.rank_changed ? (
              <Badge className="border-fuchsia-500/40 bg-fuchsia-500/10 text-[9px] text-fuchsia-600 dark:text-fuchsia-400">
                rank change: {d.from_rank} → {d.to_rank}
              </Badge>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-3 font-mono text-[11px]">
            <span className="text-sky-600 dark:text-sky-400">
              completion {d.completion_delta > 0 ? "+" : ""}
              {d.completion_delta.toLocaleString()}
            </span>
            <span className="text-fuchsia-600 dark:text-fuchsia-400">
              mastery {d.mastery_delta > 0 ? "+" : ""}
              {d.mastery_delta.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
      {snapshots.map((s) => (
        <div key={s.context_version} className="flex items-center gap-3 px-4 py-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary font-mono text-[10px] font-bold text-muted-foreground">
            v{s.context_version}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {s.rank_name} · level {s.level}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {new Date(s.computed_at).toLocaleDateString()} · C{" "}
              {s.completion_xp.toLocaleString()} · M {s.mastery_xp.toLocaleString()}{" "}
              · {s.current_streak_days}-day streak
            </p>
          </div>
          <Badge variant="outline" className="text-[9px]">
            {s.freeze_status.replace("_", " ")}
          </Badge>
        </div>
      ))}
    </div>
  );
}
