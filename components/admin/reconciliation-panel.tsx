"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  Scale,
  TriangleAlert,
} from "lucide-react";

import { reconcileLedgerBalance } from "@/lib/api/gamification";
import { MOCK_ADMIN_USERS } from "@/lib/mocks/admin";
import { useSession } from "@/components/providers/session-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonLines } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";

/**
 * Balance reconciliation (Task 3) — an admin-only read that sums a user's
 * ledger entries and flags a mismatch against the cached balance in
 * ProgressContext. The verdict comes from reconcileLedgerBalance (mock
 * server); this panel only renders it — the client never re-derives a
 * balance (build.md §3, "server always wins").
 */
export function ReconciliationPanel() {
  const { user } = useSession();

  // Default: the demo learner (reconciles cleanly). Ravi Kapoor's fixture
  // has deliberate drift; "missing-user" exercises the 404 error state.
  const OPTIONS = [
    ...MOCK_ADMIN_USERS.filter((u) => u.id !== user?.id),
    { id: "missing-user", display_name: "missing-user (404 demo)" },
  ];
  const [userId, setUserId] = React.useState<string>(OPTIONS[0]?.id ?? "");

  const reconcileQuery = useQuery({
    queryKey: ["ledger-reconcile", userId],
    queryFn: () => reconcileLedgerBalance(userId),
    enabled: Boolean(user) && Boolean(userId),
  });

  const data = reconcileQuery.data;

  return (
    <Card className="mt-6">
      <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-small">
          <Scale className="size-4 text-primary" />
          Balance reconciliation
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4 pt-2">
        <p className="text-sm text-muted-foreground">
          Sums a user&apos;s ledger entries and flags a mismatch against the
          cached balance in their ProgressContext. The verdict is computed
          server-side — this view never re-derives a balance.
        </p>

        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <Label htmlFor="reconcile-user">User</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger id="reconcile-user">
              <SelectValue placeholder="Choose a user" />
            </SelectTrigger>
            <SelectContent>
              {OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {reconcileQuery.isLoading ? (
          <SkeletonLines count={3} className="max-w-lg" />
        ) : reconcileQuery.isError || !data ? (
          <ErrorState
            title="Couldn't reconcile this user"
            message={
              reconcileQuery.error instanceof Error
                ? reconcileQuery.error.message
                : "The ledger is not responding."
            }
            onRetry={() => reconcileQuery.refetch()}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium",
                data.reconciled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-700",
              )}
              role="status"
            >
              {data.reconciled ? (
                <BadgeCheck className="size-4 shrink-0" />
              ) : (
                <TriangleAlert className="size-4 shrink-0" />
              )}
              {data.reconciled
                ? "Reconciled — the ledger and the cached balance agree."
                : `Mismatch detected — the ledger is ${Math.abs(
                    data.delta_xp,
                  )} XP off the cached balance.`}
            </div>

            <dl className="grid gap-x-8 gap-y-1.5 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Ledger sum ({data.entry_count} entries)</dt>
                <dd className="font-display text-small font-bold text-foreground">
                  {data.ledger_sum} XP
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cached balance (ProgressContext)</dt>
                <dd className="font-display text-small font-bold text-foreground">
                  {data.cached_total_xp} XP
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Delta</dt>
                <dd
                  className={cn(
                    "font-display text-small font-bold",
                    data.reconciled ? "text-emerald-700" : "text-rose-700",
                  )}
                >
                  {data.delta_xp > 0 ? "+" : ""}
                  {data.delta_xp}
                </dd>
              </div>
            </dl>

            {data.reconciled ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Activity className="size-3 text-emerald-700" />
                Live check — switch users to see the drift fixture (Ravi Kapoor) and
                the 404 demo (missing-user).
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
