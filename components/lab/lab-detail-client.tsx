"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Hourglass,
  LoaderCircle,
  Lock,
  Monitor,
  Play,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  Terminal,
} from "lucide-react";

import type { Lab } from "@/lib/contracts/lab";
import { getLab, provisionSession } from "@/lib/api/lab";
import { DEMO_MODE } from "@/lib/config";
import { getCatalogProduct, hasEntitlement } from "@/lib/api/commerce";
import { AddToCartButton } from "@/components/commerce/add-to-cart-button";
import { BuyNowButton } from "@/components/commerce/buy-now-button";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Lab detail — objectives, meta, and the Start-Lab flow.             */
/*                                                                     */
/*  Start Lab → provisionSession() (mock orchestrator) → navigate to   */
/*  the session view. States: loading, 404, error, provision spinner.  */
/* ------------------------------------------------------------------ */

const DIFFICULTY_STYLES: Record<
  Lab["difficulty"],
  { label: string; className: string }
> = {
  beginner: {
    label: "Beginner",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  },
  intermediate: {
    label: "Intermediate",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  },
  advanced: {
    label: "Advanced",
    className: "border-rose-500/40 bg-rose-500/10 text-rose-600",
  },
};

export function LabDetailClient({ labId }: { labId: string }) {
  const router = useRouter();
  const { user } = useSession();

  const labQuery = useQuery({
    queryKey: ["lab", labId],
    queryFn: () => getLab(labId),
  });

  // F6 entitlement gate: some labs are sold as lab passes (catalog lookup).
  const catalogQuery = useQuery({
    queryKey: ["catalog-product", labId],
    queryFn: () => getCatalogProduct(labId),
    enabled: Boolean(user),
  });
  const entitlementQuery = useQuery({
    queryKey: ["entitlement", labId, user?.id ?? ""],
    queryFn: () => hasEntitlement(user?.id ?? "", labId),
    enabled: Boolean(user && catalogQuery.data),
  });
  const isPaidLab = Boolean(catalogQuery.data);
  const isLocked = Boolean(
    isPaidLab && user && entitlementQuery.data === false,
  );
  // While the entitlement read is in flight, a paid lab must not show the
  // Start button (it could be clicked before access resolves).
  const accessPending = Boolean(isPaidLab && user && entitlementQuery.isLoading);

  const provision = useMutation({
    mutationFn: () =>
      provisionSession(labId, user?.id ?? "").then((session) => {
        router.push(`/labs/${labId}/session/${session.session_id}`);
      }),
  });

  /* ---------- Loading ---------- */
  if (labQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonLines count={2} className="max-w-xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <SkeletonLines count={6} />
          <Card className="h-64 p-4">
            <SkeletonLines count={3} />
          </Card>
        </div>
      </PageContainer>
    );
  }

  /* ---------- Error / 404 ---------- */
  if (labQuery.isError || !labQuery.data) {
    const err = labQuery.error;
    const is404 =
      err instanceof Error &&
      "status" in err &&
      (err as { status: number }).status === 404;
    return (
      <PageContainer>
        {is404 ? (
          <EmptyState
            icon={ShieldQuestion}
            title="Lab not found"
            description={`No lab exists with the id "${labId}". It may have been unpublished or the URL is wrong.`}
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/labs">Browse labs</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title="Lab unavailable"
            message={
              err instanceof Error
                ? err.message
                : "The lab catalog backend is not responding."
            }
            code="LAB_ERR"
            onRetry={() => labQuery.refetch()}
          />
        )}
      </PageContainer>
    );
  }

  const lab = labQuery.data;
  const diff = DIFFICULTY_STYLES[lab.difficulty];

  return (
    <PageContainer>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left — description + objectives */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-500">
                {lab.category}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  diff.className,
                )}
              >
                {diff.label}
              </span>
              {lab.requires_gui ? (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Monitor className="size-3" /> GUI session
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight">
              {lab.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {lab.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 border-y border-border py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Hourglass className="size-3.5" />
              Estimated:{" "}
              <span className="font-medium text-foreground">
                ~{lab.estimated_minutes} min
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Hard timeout:{" "}
              <span className="font-medium text-foreground">
                {lab.hard_timeout_minutes} min
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Terminal className="size-3.5" />
              {lab.requires_gui ? "Guacamole GUI viewer" : "ttyd shell over WebSocket"}
            </span>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Objectives
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Completion is verified against the live session — never from the
              browser.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {lab.objectives.map((objective, i) => (
                <Card
                  key={objective.id}
                  className="flex items-start gap-3 border-border/70 px-4 py-3 shadow-none"
                >
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border bg-secondary font-mono text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-sm font-medium">{objective.title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {objective.description}
                    </p>
                    {objective.hints.length > 0 ? (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/70">
                        <Sparkles className="size-3" />
                        {objective.hints.length}{" "}
                        {objective.hints.length === 1 ? "hint" : "hints"} available
                        on demand
                      </p>
                    ) : null}
                  </div>
                  {objective.requires_terminal ? (
                    <Terminal className="ml-auto mt-1 size-3.5 shrink-0 text-muted-foreground/60" />
                  ) : null}
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right — start card */}
        <div className="lg:sticky lg:top-20">
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Start the lab</span>
              <ShieldCheck className="size-4 text-emerald-500" />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              A dedicated sandbox is provisioned on a session-private network.
              Everything is torn down at the hard timeout.
            </p>
            <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Isolated microVM — no internet egress
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Objectives verified server-side
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Hints tracked ({lab.hard_timeout_minutes} min hard stop)
              </li>
            </ul>

            {!user && isPaidLab ? (
              <Button variant="gradient" className="w-full gap-2" asChild>
                <Link href={`/login?next=/labs/${labId}`}>
                  <Lock className="size-4" />
                  Sign in to buy this lab
                </Link>
              </Button>
            ) : accessPending ? (
              <Button disabled className="w-full gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                Checking access…
              </Button>
            ) : isLocked ? (
              <div className="flex flex-col gap-2">
                <BuyNowButton productId={labId} className="w-full" />
                <AddToCartButton productId={labId} className="w-full" />
              </div>
            ) : (
              <Button
                onClick={() => provision.mutate()}
                disabled={!user || provision.isPending}
                className="w-full gap-2"
              >
                {provision.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Provisioning…
                  </>
                ) : (
                  <>
                    <Play className="size-4" />
                    Start Lab
                  </>
                )}
              </Button>
            )}

            {isLocked ? (
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-warning" />
                This lab requires a lab pass. Payment happens on the
                provider&apos;s hosted page — no card data touches Zapsters.
              </p>
            ) : null}

            {provision.isPending ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3"
              >
                <div className="flex items-center gap-2 text-xs">
                  <LoaderCircle className="size-3.5 animate-spin text-emerald-500" />
                  <span className="font-medium">Spinning up sandbox…</span>
                </div>
                <div className="flex h-1 w-full gap-0.5 overflow-hidden">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="h-full flex-1 rounded-full bg-emerald-500/70"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  microVM boot · private network · shell bridge
                </p>
              </motion.div>
            ) : null}

            {!user && !isPaidLab ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5 shrink-0" />
                Sign in to start a lab session.
              </p>
            ) : null}

            {provision.isError ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {provision.error instanceof Error
                    ? provision.error.message
                    : "Provisioning failed."}
                </span>
              </div>
            ) : null}
          </Card>

          {DEMO_MODE ? (
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <FlaskConical className="mt-0.5 size-3 shrink-0" />
              Mock note: provisioning is simulated — a session object is
              created against the mock orchestrator and the terminal connects
              to the scripted bridge.
            </p>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
