"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  BadgeX,
  Fingerprint,
  ShieldCheck,
  ShieldQuestion,
  Stamp,
} from "lucide-react";

import { verifyBadge } from "@/lib/api/gamification";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";
import { SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Mock verify page — the frontend of /verify/{credential_id} (§7.3).  */
/*  Independently re-verifies and renders current truth. All three      */
/*  states are demoable via the badge wall links.                       */
/* ------------------------------------------------------------------ */

const STATUS_META = {
  verified: {
    label: "Verified",
    icon: BadgeCheck,
    text: "text-emerald-700",
    ring: "border-emerald-500/40 bg-emerald-500/10",
  },
  flagged: {
    label: "Pending review",
    icon: ShieldQuestion,
    text: "text-amber-700",
    ring: "border-amber-500/40 bg-amber-500/10",
  },
  revoked: {
    label: "Revoked",
    icon: BadgeX,
    text: "text-rose-700",
    ring: "border-rose-500/40 bg-rose-500/10",
  },
} as const;

export function VerifyClient({ credentialId }: { credentialId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["verify", credentialId],
    queryFn: () => verifyBadge(credentialId),
    retry: false,
  });

  return (
    <PageContainer narrow>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="border-b border-border bg-secondary/40 px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Fingerprint className="size-3.5" />
            zapsters.com/verify/{credentialId}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {isLoading ? (
            <div className="py-4">
              <SkeletonLines count={4} />
            </div>
          ) : isError || !data ? (
            <ErrorState
              title="Credential not found"
              message="No credential with this id exists — it may be a forged or edited screenshot."
              code="credential_not_found"
              onRetry={() => refetch()}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">
                    {data.badge_name}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Issued by <span className="font-medium">{data.issuer}</span> to{" "}
                    <span className="font-medium">{data.subject.display_name}</span>
                  </p>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-4 py-2.5",
                    STATUS_META[data.status].ring,
                  )}
                >
                  {React.createElement(STATUS_META[data.status].icon, {
                    className: cn("size-5", STATUS_META[data.status].text),
                  })}
                  <div>
                    <p
                      className={cn(
                        "font-display text-sm font-bold",
                        STATUS_META[data.status].text,
                      )}
                    >
                      {STATUS_META[data.status].label}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {data.status}
                    </p>
                  </div>
                </div>
              </div>

              <p
                className={cn(
                  "mt-5 rounded-xl border px-4 py-3 text-sm leading-relaxed",
                  STATUS_META[data.status].ring,
                  STATUS_META[data.status].text,
                )}
              >
                {data.note}
              </p>

              {/* Claim details */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <DetailRow label="Category" value={data.claim.category} />
                <DetailRow
                  label="Earned"
                  value={new Date(data.claim.earned_at).toLocaleDateString()}
                />
                <DetailRow
                  label="Rank at issuance"
                  value={`Level ${data.claim.level} · ${data.claim.rank_name}`}
                />
                <DetailRow label="Subject" value={data.subject.display_name} />
              </div>

              {/* Signature */}
              <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-4">
                <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Stamp className="size-3.5" /> Ed25519 signature
                </p>
                <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {data.signature}
                </code>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 text-emerald-700" />
                  Re-verified against current ledger truth
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://linkedin.com" target="_blank" rel="noreferrer">
                    Share on LinkedIn
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </PageContainer>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
