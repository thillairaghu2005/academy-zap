"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, LoaderCircle, ShieldAlert, ShieldX } from "lucide-react";

import type {
  CredentialReview,
  CredentialReviewDetail,
  CredentialTransitionResult,
} from "@/lib/contracts/gamification";
import {
  getCredentialReview,
  listCredentialReviews,
  transitionCredentialReview,
} from "@/lib/data/demo/admin";
import { useSession } from "@/components/providers/session-provider";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLines } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { formatDateTime } from "@/lib/format-admin";
import { apiErrorMessage } from "@/lib/api/client";

function StatusPill({ status }: { status: CredentialReview["status"] }) {
  const styles: Record<string, string> = {
    verified: "border-success/40 bg-success/10 text-success-strong",
    flagged: "border-warning/40 bg-warning/10 text-warning-strong",
    revoked: "border-primary-border bg-primary-light text-primary",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold uppercase tracking-wide ${
        styles[status] ?? ""
      }`}
    >
      {status}
    </span>
  );
}

/** One reviewer decision — clear (verified) or revoke; both record an immutable reason. */
function ReviewActions({
  review,
  onDone,
}: {
  review: CredentialReviewDetail;
  onDone: (result: CredentialTransitionResult) => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = React.useState("");
  const [confirming, setConfirming] = React.useState<"verified" | "revoked" | null>(null);

  const mutation = useMutation({
    mutationFn: (toStatus: "verified" | "revoked") =>
      transitionCredentialReview(review.id, toStatus, reason.trim() || null),
    onSuccess: (result) => {
      setConfirming(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      onDone(result);
    },
  });

  const canRevoke = review.status !== "revoked";
  const canClear = review.status === "flagged";
  const pending = mutation.isPending;

  const submit = (toStatus: "verified" | "revoked") => {
    mutation.mutate(toStatus);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`reason-${review.id}`} className="text-caption text-muted-foreground">
          Review note (recorded in the immutable history)
        </Label>
        <Textarea
          id={`reason-${review.id}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional — why this decision was made…"
          rows={2}
        />
      </div>

      {mutation.isError ? (
        <p className="text-sm font-medium text-primary" role="alert">
          {apiErrorMessage(mutation.error)}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canClear ? (
          <Button
            variant="default"
            onClick={() => submit("verified")}
            disabled={pending}
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
            Clear — mark verified
          </Button>
        ) : null}
        {canRevoke ? (
          <Button variant="destructive" onClick={() => setConfirming("revoked")} disabled={pending}>
            <ShieldX className="size-4" />
            Revoke
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirming === "revoked"}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title="Revoke this credential?"
        description="The credential is not deleted — its public verify URL stays live and will report status = revoked. This decision is recorded in the immutable history and cannot be undone."
        confirmLabel="Revoke credential"
        destructive
        pending={mutation.isPending}
        onConfirm={() => submit("revoked")}
      />
    </div>
  );
}

export function AdminReviewsClient() {
  const { user, isLoading: sessionLoading } = useSession();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<CredentialReviewDetail | null>(null);

  const queueQuery = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => listCredentialReviews("flagged"),
    enabled: Boolean(user),
  });

  const detailQuery = useQuery({
    queryKey: ["admin-reviews", selectedId],
    queryFn: () => getCredentialReview(selectedId as string),
    enabled: Boolean(user) && selectedId !== null,
  });

  const openReview = (id: string) => {
    setSelectedId(id);
    setDetail(null);
  };

  if (sessionLoading) {
    return (
      <PageContainer>
        <SkeletonLines count={2} className="max-w-md" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <SkeletonLines count={6} />
          <SkeletonLines count={8} />
        </div>
      </PageContainer>
    );
  }

  const reviews = queueQuery.data ?? [];
  const activeDetail = detail ?? detailQuery.data ?? null;

  return (
    <PageContainer>
      <div>
        <h1 className="font-display text-h1">Credential reviews</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Flagged credentials routed by the integrity gate (gamification §7.4). A reviewer
          clears or revokes; every decision is an immutable history row and a revoked
          credential keeps its stable public verify URL reporting <code>revoked</code>.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Queue */}
        <section className="min-w-0 rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldAlert className="size-4 text-warning-strong" />
              Flagged queue
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-caption font-medium text-muted-foreground">
                {queueQuery.data?.length ?? 0}
              </span>
            </h2>
          </div>

          {queueQuery.isLoading ? (
            <div className="p-4">
              <SkeletonLines count={4} />
            </div>
          ) : queueQuery.isError ? (
            <div className="p-4">
              <ErrorState
                title="Could not load the review queue"
                message={apiErrorMessage(queueQuery.error)}
                onRetry={() => queueQuery.refetch()}
              />
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={BadgeCheck}
                title="Queue is clear"
                description="No flagged credentials are waiting for a decision."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {reviews.map((review) => (
                <li key={review.id}>
                  <button
                    type="button"
                    onClick={() => openReview(review.id)}
                    className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors outline-none hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                      selectedId === review.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {review.badge_id}
                      <StatusPill status={review.status} />
                    </span>
                    <code className="truncate font-mono text-[11px] text-muted-foreground">
                      {review.public_id}
                    </code>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      issued {formatDateTime(review.issued_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Detail + actions */}
        <section className="min-w-0 rounded-xl border border-border bg-card">
          {!activeDetail ? (
            <div className="p-8">
              <EmptyState
                icon={ShieldAlert}
                title="Select a credential"
                description="Choose a flagged credential from the queue to review it."
              />
            </div>
          ) : detailQuery.isLoading ? (
            <div className="p-6">
              <SkeletonLines count={8} />
            </div>
          ) : detailQuery.isError ? (
            <div className="p-6">
              <ErrorState
                title="Could not load review"
                message={apiErrorMessage(detailQuery.error)}
                onRetry={() => detailQuery.refetch()}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-h3">{activeDetail.badge_id}</h2>
                <StatusPill status={activeDetail.status} />
              </div>

              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-caption text-muted-foreground">Public credential</dt>
                  <dd>
                    <code className="font-mono text-xs">{activeDetail.public_id}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-muted-foreground">Holder</dt>
                  <dd>
                    <code className="font-mono text-xs">{activeDetail.user_id}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-muted-foreground">Issued</dt>
                  <dd className="font-mono text-xs">{formatDateTime(activeDetail.issued_at)}</dd>
                </div>
                <div>
                  <dt className="text-caption text-muted-foreground">Source event</dt>
                  <dd>
                    <code className="font-mono text-xs">{activeDetail.source_event_id}</code>
                  </dd>
                </div>
              </dl>

              <div>
                <h3 className="mb-2 text-caption font-semibold uppercase tracking-widest text-muted-foreground">
                  Decision history
                </h3>
                {activeDetail.history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No review decisions recorded yet.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {activeDetail.history.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-col gap-1 rounded-lg border border-border bg-surface-1 p-3"
                      >
                        <span className="flex items-center gap-2 text-xs">
                          <StatusPill status={entry.previous_status} />
                          <span aria-hidden>→</span>
                          <StatusPill status={entry.new_status} />
                          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                            {formatDateTime(entry.created_at)}
                          </span>
                        </span>
                        {entry.reason ? (
                          <p className="text-sm text-muted-foreground">{entry.reason}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <ReviewActions
                  review={activeDetail}
                  onDone={(result) => setDetail({ ...activeDetail, ...result })}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
