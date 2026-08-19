"use client";

import * as React from "react";
import { formatLongEnglishDate } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  BadgeX,
  CalendarDays,
  Fingerprint,
  Hash,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  Stamp,
  Trophy,
} from "lucide-react";

import { verifyBadge } from "@/lib/data/demo/gamification";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrustBadge } from "@/components/shared/trust-badge";

const STATUS_META = {
  verified: {
    label: "Verified credential",
    icon: BadgeCheck,
    text: "text-success-strong",
    ink: "text-success-on-dark",
    ring: "border-success/40 bg-success/10",
    art: "bg-primary",
    description: "This credential is valid and backed by an intact Zapsters ledger.",
  },
  flagged: {
    label: "Pending integrity review",
    icon: ShieldQuestion,
    text: "text-warning-strong",
    ink: "text-warning-on-dark",
    ring: "border-warning/40 bg-warning/10",
    art: "bg-warning",
    description: "Public trust is paused while the underlying activity is reviewed.",
  },
  revoked: {
    label: "Credential revoked",
    icon: BadgeX,
    text: "text-primary",
    ink: "text-primary-light",
    ring: "border-primary-border bg-primary-muted",
    art: "bg-primary-deep",
    description: "This credential no longer certifies the underlying achievement.",
  },
} as const;

function VerificationLoading() {
  return (
    <PageContainer className="max-w-5xl">
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl">
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:p-14">
          <Skeleton className="aspect-square w-full rounded-[1.5rem]" />
          <div className="flex flex-col justify-center gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="mt-5 h-24 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function CredentialArt({
  badgeName,
  category,
  status,
}: {
  badgeName: string;
  category: string;
  status: keyof typeof STATUS_META;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <div
      className="relative aspect-square overflow-hidden rounded-[1.5rem] border border-white/15 bg-primary-deep p-5 shadow-2xl shadow-black/30"
      aria-label={`${badgeName} credential artwork`}
    >
      <div className={cn("absolute -right-16 -top-16 size-64 rounded-full opacity-60 blur-2xl", meta.art)} />
      <div className="absolute -bottom-24 -left-20 size-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative flex h-full flex-col justify-between text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
            <Trophy className="size-3.5 text-primary-light" />
            Zapsters credential
          </div>
          <span className="rounded-full border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/60">
            {category}
          </span>
        </div>

        <div className="mx-auto grid size-44 place-items-center rounded-full border border-white/20 bg-white/10 shadow-[0_0_0_12px_rgb(255_255_255_/_4%)] sm:size-52">
          <div className="grid size-32 place-items-center rounded-full border border-white/30 bg-primary-deep/70 sm:size-40">
            <Icon className={cn("size-20", meta.ink)} strokeWidth={1.25} />
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-xl font-semibold">{badgeName}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/50">
              Skill signal / {status}
            </p>
          </div>
          <Sparkles className="size-5 text-primary-light" />
        </div>
      </div>
    </div>
  );
}

export function VerifyClient({ credentialId }: { credentialId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["verify", credentialId],
    queryFn: () => verifyBadge(credentialId),
    retry: false,
  });

  if (isLoading) return <VerificationLoading />;
  if (isError || !data) {
    return (
      <PageContainer narrow>
        <ErrorState
          title="Credential not found"
          message="No credential with this id exists. It may be a forged or edited screenshot."
          code="credential_not_found"
          onRetry={() => refetch()}
        />
      </PageContainer>
    );
  }

  const meta = STATUS_META[data.status];
  const StatusIcon = meta.icon;
  const earnedDate = formatLongEnglishDate(data.claim.earned_at);

  return (
    <PageContainer className="max-w-5xl">
      <div className="motion-safe:animate-fade-up overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl shadow-primary/5">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-secondary/30 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo size={30} linkTo={null} />
            <div>
              <p className="font-display text-sm font-semibold">Zapsters</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Credential verification
              </p>
            </div>
          </div>
          <p className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <Fingerprint className="size-3.5" />
            /verify/{credentialId}
          </p>
        </header>

        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12 lg:p-12">
          <CredentialArt
            badgeName={data.badge_name}
            category={data.claim.category}
            status={data.status}
          />

          <div className="flex flex-col justify-center">
            <div className={cn("inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold", meta.ring, meta.text)}>
              <StatusIcon className="size-4" />
              {meta.label}
            </div>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Verified achievement
            </p>
            <h1 className="mt-3 max-w-xl font-display text-hero leading-[0.95]">
              {data.badge_name}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Awarded to <span className="font-semibold text-foreground">{data.subject.display_name}</span> for demonstrated skill in {data.claim.category}.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <DetailRow icon={Trophy} label="Rank at issuance" value={`${data.claim.rank_name} · level ${data.claim.level}`} />
              <DetailRow icon={CalendarDays} label="Date earned" value={earnedDate} />
            </div>

            <div className={cn("mt-5 rounded-xl border px-4 py-3 text-sm leading-relaxed", meta.ring, meta.text)}>
              <p className="font-medium">{meta.description}</p>
              <p className="mt-1 opacity-80">{data.note}</p>
            </div>
          </div>
        </div>

        <footer className="grid gap-5 border-t border-border bg-secondary/20 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Issued and verified by Zapsters</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Independent re-verification against current ledger truth</p>
            </div>
            <TrustBadge kind="verified" label="Certificate verification" detail="The credential status is checked against the current server-owned record." />
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer">
              Share on LinkedIn
            </a>
          </Button>
        </footer>

        <details className="border-t border-border px-5 py-4 sm:px-8">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <Hash className="size-3.5" />
            View credential proof
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Stamp className="size-3.5" /> Ed25519 signature
            </div>
            <code className="break-all rounded-lg border border-border bg-secondary/40 p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
              {data.signature}
            </code>
          </div>
        </details>
      </div>
    </PageContainer>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
