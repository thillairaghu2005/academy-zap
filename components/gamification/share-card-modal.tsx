"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { m as motion } from "framer-motion";
import { Check, Download, Loader2, Share2, ShieldCheck, X } from "lucide-react";

import { getShareCard } from "@/lib/data/demo/gamification";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLines } from "@/components/shared/skeletons";

/* ------------------------------------------------------------------ */
/*  Share-card modal — client PREVIEW via html-to-image; the canonical  */
/*  shareable file is server-rendered and hash-verifiable (§6, §7.3).   */
/*  In mock mode the downloaded PNG is the preview itself, stamped with  */
/*  the server-provided card_hash.                                      */
/* ------------------------------------------------------------------ */

export function ShareCardModal({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["share-card", userId],
    queryFn: () => getShareCard(userId),
    enabled: open,
    retry: false,
  });

  const cardRef = React.useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = React.useState(false);
  const [downloaded, setDownloaded] = React.useState(false);

  const handleDownload = async () => {
    if (!cardRef.current || !data) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const png = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#18181B",
      });
      const link = document.createElement("a");
      link.download = `zapsters-rank-${data.rank_name.toLowerCase()}.png`;
      link.href = png;
      link.click();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2200);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4" /> Share your rank card
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6">
            <SkeletonLines count={4} />
          </div>
        ) : isError || !data ? (
          <ErrorState
            title="Share card unavailable"
            message={
              "error" in (data ?? {})
                ? String((data as { error?: unknown }).error)
                : "Could not render the share card right now."
            }
            onRetry={() => refetch()}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Card preview */}
            <motion.div
              ref={cardRef}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary-deep p-6"
            >
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="font-display text-small font-bold text-white">
                    ZAPSTERS
                  </p>
                  <span className="rounded-full border border-white/20 px-2 py-0.5 font-mono text-[9px] text-white/60">
                    {data.league_tier ? data.league_tier.toUpperCase() : "UNRANKED"}
                  </span>
                </div>
                <p className="mt-6 font-display text-caption uppercase tracking-widest text-white/50">
                  Rank {data.level} · {data.rank_name}
                </p>
                <h3 className="mt-1 font-display text-h3 text-white">
                  {data.display_name}
                </h3>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <CardStat label="Completion XP" value={data.completion_xp.toLocaleString()} />
                  <CardStat label="Mastery XP" value={data.mastery_xp.toLocaleString()} />
                  <CardStat label="Streak" value={`${data.current_streak_days} days`} />
                  <CardStat label="Prestige" value={data.prestige_tier > 0 ? `${data.prestige_tier}` : "—"} />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="flex items-center gap-1 font-mono text-[9px] text-white/50">
                    <ShieldCheck className="size-3" /> {data.card_hash}
                  </span>
                  <span className="font-mono text-[9px] text-white/50">
                    verify/zapsters
                  </span>
                </div>
              </div>
            </motion.div>

            <p className="text-caption leading-relaxed text-muted-foreground">
              The card is hash-stamped ({data.card_hash.slice(0, 12)}…) so a
              shared screenshot routes back to a live, re-verifiable source.
              The canonical file is server-rendered; this is the client preview.
            </p>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="animate-spin" />
                ) : downloaded ? (
                  <Check />
                ) : (
                  <Download />
                )}
                {downloaded ? "Saved" : "Download PNG"}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X /> Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-caption uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
